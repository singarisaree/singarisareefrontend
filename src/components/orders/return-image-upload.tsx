'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

interface ReturnImageUploadProps {
  images: Array<File | null>;
  previews: Array<string | null>;
  onChange: (images: Array<File | null>, previews: Array<string | null>) => void;
}

export function ReturnImageUpload({ images, previews, onChange }: ReturnImageUploadProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([null, null, null]);

  const updateSlot = (slot: number, file: File | null, preview: string | null) => {
    const nextImages = [...images];
    const nextPreviews = [...previews];
    if (nextPreviews[slot]) {
      URL.revokeObjectURL(nextPreviews[slot]!);
    }
    nextImages[slot] = file;
    nextPreviews[slot] = preview;
    onChange(nextImages, nextPreviews);
  };

  const removeImage = (slot: number) => {
    updateSlot(slot, null, null);
    const input = inputRefs.current[slot];
    if (input) input.value = '';
  };

  const handleFileChange = (slot: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Please upload a JPG, PNG, or WebP image');
      event.target.value = '';
      return;
    }

    const preview = URL.createObjectURL(file);
    updateSlot(slot, file, preview);
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {Array.from({ length: 3 }, (_, slot) => {
          const preview = previews[slot];

          return (
            <div key={slot} className="relative">
              <input
                ref={(el) => {
                  inputRefs.current[slot] = el;
                }}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => handleFileChange(slot, event)}
              />

              {preview ? (
                <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-beige bg-beige">
                  <Image src={preview} alt={`Return photo ${slot + 1}`} fill sizes="33vw" className="object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(slot)}
                    className="absolute right-1.5 top-1.5 rounded-full bg-charcoal/75 p-1 text-white"
                    aria-label={`Remove photo ${slot + 1}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => inputRefs.current[slot]?.click()}
                  className="flex aspect-[3/4] w-full flex-col items-center justify-center rounded-lg border border-dashed border-beige bg-beige/30 text-brown-light transition-colors hover:border-gold hover:text-gold"
                >
                  <ImagePlus className="h-5 w-5" />
                  <span className="mt-2 text-[10px] font-medium sm:text-xs">Photo {slot + 1}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-brown-light">
        Upload 3 product photos from your device (JPG, PNG, or WebP).
      </p>
    </>
  );
}
