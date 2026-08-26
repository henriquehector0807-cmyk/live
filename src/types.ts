export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  highlightTime?: number;
}

export interface Comment {
  id: string;
  time: number;
  author: string;
  text: string;
}

export interface LiveStream {
  id: string;
  sellerName: string;
  sellerAvatar: string;
  title: string;
  videoUrl: string;
  thumbnail: string;
  viewers: number;
  likes: number;
  products: Product[];
  comments: Comment[];
}
