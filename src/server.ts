import app from "./app";
import config from "./app/config";
import { transporter } from "./app/lib/nodemailer";

const PORT = config.port || 5000;

if (!process.env.VERCEL) {
  transporter.verify((error) => {
    if (error) {
      console.warn("Nodemailer verification notice:", error.message);
    } else {
      console.log("Nodemailer Connected Successfully.");
    }
  });

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
