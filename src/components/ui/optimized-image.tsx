import Image, { type ImageProps } from 'next/image';

type OptimizedImageProps = ImageProps & {
  unoptimized?: boolean;
};

export function OptimizedImage({
  src,
  alt = '',
  unoptimized,
  quality = 100,
  ...props
}: OptimizedImageProps) {
  const skipOptimization = unoptimized ?? true;

  return <Image src={src} alt={alt} unoptimized={skipOptimization} quality={quality} {...props} />;
}
