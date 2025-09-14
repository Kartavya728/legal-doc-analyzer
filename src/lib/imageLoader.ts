interface LoaderProps {
  src: string;
  width: number;
  quality?: number;
}

export default function imageLoader({ src }: LoaderProps) {
  return src; // 👈 just return the original URL, no restrictions
}
