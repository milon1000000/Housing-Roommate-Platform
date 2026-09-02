import passport from "passport";
import {
  Strategy as GoogleStrategy,
  type Profile,
  type VerifyCallback,
} from "passport-google-oauth20";
import { AuthProvider, Role, UserStatus } from "../../generated/prisma/enums";
import config from ".";
import { prisma } from "../lib/prisma";
import { transporter } from "../lib/nodemailer";
import path from "node:path";
import ejs from "ejs";

passport.use(
  new GoogleStrategy(
    {
      clientID: config.google_client_id,
      clientSecret: config.google_client_secret,
      callbackURL: config.google_client_callback,
      scope: ["profile", "email"],
    },
    async (
      _accessToken: string,
      _refreshToken: string,
      profile: Profile,
      done: VerifyCallback,
    ) => {
      try {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;
        const googleId = profile.id;

        if (!email) {
          return done(null, false, { message: "No email found from google" });
        }
        if (!name) {
          return done(null, false, { message: "No name found from google" });
        }

        let user = await prisma.user.findFirst({
          where: {
            email,
            role: Role.TENANT,
            googleId,
          },
          include: { tenant: true },
        });

        let isNewUser = false;

        if (!user) {
          const existingCredentialUser = await prisma.user.findFirst({
            where: {
              email,
              role: Role.TENANT,
              authProvider: AuthProvider.CREDENTIAL,
            },
            include: { tenant: true },
          });

          if (existingCredentialUser) {
            if (existingCredentialUser.status === UserStatus.BLOCKED) {
              return done(null, false, { message: "User is blocked" });
            }
            if (
              existingCredentialUser.isDeleted ||
              existingCredentialUser.status === UserStatus.DELETED
            ) {
              return done(null, false, { message: "User is deleted" });
            }

            user = await prisma.user.update({
              where: { id: existingCredentialUser.id },
              data: {
                googleId,
                authProvider: AuthProvider.GOOGLE,
                emailVerified: true,
              },
              include: { tenant: true },
            });
            isNewUser = true;
          } else {
            user = await prisma.user.create({
              data: {
                name,
                email,
                role: Role.TENANT,
                googleId,
                authProvider: AuthProvider.GOOGLE,
                emailVerified: true,
                tenant: {
                  create: { name, email },
                },
              },
              include: { tenant: true },
            });
            isNewUser = true;
          }
        }

        if (user.status === UserStatus.BLOCKED) {
          return done(null, false, { message: "User is blocked" });
        }
        if (user.isDeleted || user.status === UserStatus.DELETED) {
          return done(null, false, { message: "User is deleted" });
        }

        if (isNewUser) {
          const templatePath = path.join(
            process.cwd(),
            "src/app/templates/tenant-google-welcome.ejs",
          );

          const templateData = {
            name: user.name,
          };

          const html = await ejs.renderFile(templatePath, templateData);

          await transporter.sendMail({
            from: config.email_sender,
            to: user.email,
            subject: "Google Sign In",
            html,
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    },
  ),
);

export default passport;