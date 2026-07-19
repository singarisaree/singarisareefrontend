'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StoreFooter } from '@/components/layout/store-footer';
import { useStoreSettings } from '@/components/store-settings-provider';
import { STORE_CONTACT } from '@/lib/store-contact';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().min(10),
});

export default function ContactPage() {
  const settings = useStoreSettings();
  const email = settings.store_email || STORE_CONTACT.email;
  const phone = settings.store_phone || STORE_CONTACT.phone;
  const address = settings.store_address || STORE_CONTACT.address;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async () => {
    toast.success('Message sent! We will get back to you soon.');
    reset();
  };

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="font-serif text-4xl text-charcoal text-center">Contact Us</h1>
        <p className="mt-2 text-center text-brown-light">We&apos;d love to hear from you</p>

        <div className="mt-12 grid gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <Mail className="h-5 w-5 text-gold mt-1" />
              <div>
                <h3 className="font-medium">Email</h3>
                <a href={`mailto:${email}`} className="text-sm text-brown-light hover:text-maroon">
                  {email}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Phone className="h-5 w-5 text-gold mt-1" />
              <div>
                <h3 className="font-medium">Phone</h3>
                <a href={`tel:${phone.replace(/\s/g, '')}`} className="text-sm text-brown-light hover:text-maroon">
                  {phone}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Clock className="h-5 w-5 text-gold mt-1" />
              <div>
                <h3 className="font-medium">Support Hours</h3>
                <p className="text-sm text-brown-light">{STORE_CONTACT.hours}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <MapPin className="h-5 w-5 text-gold mt-1" />
              <div>
                <h3 className="font-medium">Address</h3>
                <p className="text-sm text-brown-light">{address}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="luxury-card space-y-4 p-6">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message as string}</p>}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message as string}</p>}
            </div>
            <div>
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input id="phone" {...register('phone')} />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" {...register('message')} />
              {errors.message && <p className="text-xs text-red-600 mt-1">{errors.message.message as string}</p>}
            </div>
            <Button type="submit" variant="gold" disabled={isSubmitting} className="w-full">
              Send Message
            </Button>
          </form>
        </div>
      </div>
      <StoreFooter />
    </>
  );
}
