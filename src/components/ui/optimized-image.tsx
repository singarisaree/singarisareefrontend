import Image, { type ImageProps } from 'next/image';
import { isLocalImagePreview } from '@/lib/image';

type OptimizedImageProps = ImageProps & {
  unoptimized?: boolean;
};

export function OptimizedImage({
  src,
  alt = '',
  unoptimized,
  quality = 80,
  ...props
}: OptimizedImageProps) {
  const srcStr = typeof src === 'string' ? src : '';
  const skipOptimization = unoptimized ?? (srcStr ? isLocalImagePreview(srcStr) : false);

  return <Image src={src} alt={alt} unoptimized={skipOptimization} quality={quality} {...props} />;
}
