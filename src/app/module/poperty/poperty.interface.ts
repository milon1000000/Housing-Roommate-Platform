export interface ICreateProperty {
  title: string;
  description: string;
  address: string;
  city: string;
  rentPrice: number;
  totalRooms: number;
  amenities?: string[];
  isAvailable?: boolean;
}

export interface IUpdateProperty {
  title?: string;
  description?: string;
  address?: string;
  city?: string;
  rentPrice?: number;
  totalRooms?: number;
  amenities?: string[];
  isAvailable?: boolean;
}