"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { toast } from "sonner";
import { adminSettingsService } from "@/services/admin.service";
import { HeroBannersSettings } from "@/components/admin/hero-banners-settings";
import { InvoiceSignaturePad } from "@/components/admin/invoice-signature-pad";
import { WhatsAppTemplateSettings } from "@/components/admin/whatsapp-template-settings";
import { AdminPasswordSettings } from "@/components/admin/admin-password-settings";
import { InstagramVideosSettings } from "@/components/admin/instagram-videos-settings";
import { refreshStorefrontAfterSettingsChange } from "@/lib/refresh-storefront";

const SETTINGS_TABS = [
  { id: "hero-banners", label: "Hero Banners" },
  { id: "instagram-videos", label: "Instagram Videos" },
  { id: "our-story", label: "Our Story" },
  { id: "announcement", label: "Announcement" },
  { id: "shipping", label: "Shipping" },
  { id: "quick-pickup", label: "Quick Delivery" },
  { id: "whatsapp-templates", label: "WhatsApp Templates" },
  { id: "signature", label: "Signature" },
  { id: "password", label: "Password" },
] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number]["id"];
const EMPTY_SETTINGS: Awaited<ReturnType<typeof adminSettingsService.getAll>> =
  [];

const ANNOUNCEMENT_KEYS = new Set([
  "announcement_bar_enabled",
  "announcement_bar_text",
  "announcement_bar_secondary_text",
]);

async function loadAnnouncementSettings() {
  const [announcement, shipping] = await Promise.all([
    adminSettingsService.getAll("announcement"),
    adminSettingsService.getAll("shipping"),
  ]);
  if (announcement.length > 0) return announcement;
  return shipping.filter((s) => ANNOUNCEMENT_KEYS.has(s.key));
}

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>("hero-banners");

  const [shippingCharge, setShippingCharge] = useState("99");
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(false);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState("1999");
  const [quickPickupLat, setQuickPickupLat] = useState("");
  const [quickPickupLng, setQuickPickupLng] = useState("");
  const [quickStart, setQuickStart] = useState("09:00");
  const [quickEnd, setQuickEnd] = useState("21:00");
  const [quickHolidays, setQuickHolidays] = useState<string[]>([]);
  const [holidayInput, setHolidayInput] = useState("");
  const [detectingLocation, setDetectingLocation] = useState(false);

  const [announcementEnabled, setAnnouncementEnabled] = useState(true);
  const [announcementText, setAnnouncementText] = useState(
    "FREE SHIPPING on Orders Above Rs. 1999",
  );
  const [announcementSecondary, setAnnouncementSecondary] = useState("");

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const {
    data: shippingSettings = EMPTY_SETTINGS,
    isLoading: shippingLoading,
  } = useQuery({
    queryKey: ["admin-settings-shipping"],
    queryFn: () => adminSettingsService.getAll("shipping"),
    enabled: activeTab === "shipping",
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: quickPickupSettings = EMPTY_SETTINGS,
    isLoading: quickPickupLoading,
  } = useQuery({
    queryKey: ["admin-settings-quick-pickup"],
    queryFn: () => adminSettingsService.getAll("shipping"),
    enabled: activeTab === "quick-pickup",
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: announcementSettings = EMPTY_SETTINGS,
    isLoading: announcementLoading,
  } = useQuery({
    queryKey: ["admin-settings-announcement"],
    queryFn: loadAnnouncementSettings,
    enabled: activeTab === "announcement",
    staleTime: 5 * 60 * 1000,
  });

  const { data: ourStoryImage, isLoading: ourStoryLoading } = useQuery({
    queryKey: ["admin-our-story-image"],
    queryFn: () => adminSettingsService.getOurStoryImage(),
    enabled: activeTab === "our-story",
    staleTime: 5 * 60 * 1000,
  });

  const { data: invoiceSignature, isLoading: signatureLoading } = useQuery({
    queryKey: ["admin-invoice-signature"],
    queryFn: () => adminSettingsService.getInvoiceSignature(),
    enabled: activeTab === "signature",
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const map = Object.fromEntries(
      shippingSettings.map((s) => [s.key, s.value]),
    );
    setShippingCharge(String(map.default_shipping_charge ?? 99));
    setFreeShippingEnabled(
      map.free_shipping_enabled === true ||
        map.free_shipping_enabled === "true",
    );
    setFreeShippingThreshold(String(map.free_shipping_threshold ?? 1999));
  }, [shippingSettings]);

  useEffect(() => {
    const map = Object.fromEntries(
      quickPickupSettings.map((s) => [s.key, s.value]),
    );
    setQuickPickupLat(
      map.quick_pickup_lat != null && map.quick_pickup_lat !== ""
        ? String(map.quick_pickup_lat)
        : "",
    );
    setQuickPickupLng(
      map.quick_pickup_lng != null && map.quick_pickup_lng !== ""
        ? String(map.quick_pickup_lng)
        : "",
    );
    setQuickStart(
      typeof map.quick_delivery_start === "string" &&
        /^\d{1,2}:\d{2}$/.test(map.quick_delivery_start)
        ? map.quick_delivery_start
        : "09:00",
    );
    setQuickEnd(
      typeof map.quick_delivery_end === "string" &&
        /^\d{1,2}:\d{2}$/.test(map.quick_delivery_end)
        ? map.quick_delivery_end
        : "21:00",
    );
    const holidays = Array.isArray(map.quick_holidays)
      ? map.quick_holidays
          .map((d) => String(d).trim())
          .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
          .sort()
      : [];
    setQuickHolidays(holidays);
  }, [quickPickupSettings]);

  useEffect(() => {
    const map = Object.fromEntries(
      announcementSettings.map((s) => [s.key, s.value]),
    );
    setAnnouncementEnabled(
      map.announcement_bar_enabled !== false &&
        map.announcement_bar_enabled !== "false",
    );
    setAnnouncementText(
      String(
        map.announcement_bar_text ?? "FREE SHIPPING on Orders Above Rs. 1999",
      ),
    );
    setAnnouncementSecondary(
      String(map.announcement_bar_secondary_text ?? ""),
    );
  }, [announcementSettings]);

  const saveShipping = useMutation({
    mutationFn: () =>
      adminSettingsService.update([
        {
          key: "default_shipping_charge",
          value: Number(shippingCharge),
          group: "shipping",
        },
        {
          key: "free_shipping_enabled",
          value: freeShippingEnabled,
          group: "shipping",
        },
        {
          key: "free_shipping_threshold",
          value: Number(freeShippingThreshold),
          group: "shipping",
        },
      ]),
    onSuccess: () => {
      toast.success("Shipping settings saved");
      void refreshStorefrontAfterSettingsChange();
      queryClient.invalidateQueries({ queryKey: ["admin-settings-shipping"] });
      queryClient.invalidateQueries({ queryKey: ["public-settings"] });
    },
    onError: () => toast.error("Failed to save shipping settings"),
  });

  const saveQuickPickup = useMutation({
    mutationFn: async () => {
      const lat = Number(quickPickupLat.trim());
      const lng = Number(quickPickupLng.trim());
      if (
        !quickPickupLat.trim() ||
        !quickPickupLng.trim() ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        throw new Error("Enter valid latitude and longitude");
      }
      if (
        !/^\d{1,2}:\d{2}$/.test(quickStart) ||
        !/^\d{1,2}:\d{2}$/.test(quickEnd)
      ) {
        throw new Error("Enter valid Quick start and end times (HH:MM)");
      }
      return adminSettingsService.update([
        { key: "quick_pickup_lat", value: lat, group: "shipping" },
        { key: "quick_pickup_lng", value: lng, group: "shipping" },
        { key: "quick_delivery_start", value: quickStart, group: "shipping" },
        { key: "quick_delivery_end", value: quickEnd, group: "shipping" },
        { key: "quick_holidays", value: quickHolidays, group: "shipping" },
      ]);
    },
    onSuccess: () => {
      toast.success("Quick delivery settings saved");
      queryClient.invalidateQueries({
        queryKey: ["admin-settings-quick-pickup"],
      });
    },
    onError: (error) =>
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save Quick delivery settings",
      ),
  });

  const saveAnnouncement = useMutation({
    mutationFn: () =>
      adminSettingsService.update([
        {
          key: "announcement_bar_enabled",
          value: announcementEnabled,
          group: "announcement",
        },
        {
          key: "announcement_bar_text",
          value: announcementText.trim(),
          group: "announcement",
        },
        {
          key: "announcement_bar_secondary_text",
          value: announcementSecondary.trim(),
          group: "announcement",
        },
      ]),
    onSuccess: () => {
      toast.success("Announcement saved");
      void refreshStorefrontAfterSettingsChange();
      queryClient.invalidateQueries({
        queryKey: ["admin-settings-announcement"],
      });
      queryClient.invalidateQueries({ queryKey: ["public-settings"] });
    },
    onError: () => toast.error("Failed to save announcement"),
  });

  const uploadOurStory = useMutation({
    mutationFn: (file: File) => adminSettingsService.uploadOurStoryImage(file),
    onSuccess: () => {
      toast.success("Our Story image updated");
      setPreviewUrl(null);
      void refreshStorefrontAfterSettingsChange();
      queryClient.invalidateQueries({ queryKey: ["admin-our-story-image"] });
      queryClient.invalidateQueries({ queryKey: ["public-settings"] });
    },
    onError: () => toast.error("Failed to upload image"),
  });

  const deleteOurStory = useMutation({
    mutationFn: () => adminSettingsService.deleteOurStoryImage(),
    onSuccess: () => {
      toast.success("Our Story image deleted");
      setPreviewUrl(null);
      void refreshStorefrontAfterSettingsChange();
      queryClient.invalidateQueries({ queryKey: ["admin-our-story-image"] });
      queryClient.invalidateQueries({ queryKey: ["public-settings"] });
    },
    onError: () => toast.error("Failed to delete image"),
  });

  const saveSignature = useMutation({
    mutationFn: (dataUrl: string) =>
      adminSettingsService.saveInvoiceSignature(dataUrl),
    onSuccess: () => {
      toast.success("Invoice signature saved");
      queryClient.invalidateQueries({ queryKey: ["admin-invoice-signature"] });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      toast.error(message || "Failed to save signature");
    },
  });

  const deleteSignature = useMutation({
    mutationFn: () => adminSettingsService.deleteInvoiceSignature(),
    onSuccess: () => {
      toast.success("Invoice signature deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-invoice-signature"] });
    },
    onError: () => toast.error("Failed to delete signature"),
  });

  const onShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(shippingCharge) < 0) {
      toast.error("Shipping charge cannot be negative");
      return;
    }
    if (!freeShippingEnabled && Number(freeShippingThreshold) < 0) {
      toast.error("Free shipping threshold cannot be negative");
      return;
    }
    saveShipping.mutate();
  };

  const onQuickPickupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveQuickPickup.mutate();
  };

  const detectQuickPickupLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Location is not supported in this browser");
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setQuickPickupLat(position.coords.latitude.toFixed(6));
        setQuickPickupLng(position.coords.longitude.toFixed(6));
        setDetectingLocation(false);
        toast.success("Location detected — review and save");
      },
      (error) => {
        setDetectingLocation(false);
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Location permission denied. Enter coordinates manually."
            : "Could not detect location. Enter coordinates manually.";
        toast.error(message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const onAnnouncementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (announcementEnabled && !announcementText.trim()) {
      toast.error("Main message cannot be empty");
      return;
    }
    saveAnnouncement.mutate();
  };

  const onImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (
      !["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(
        file.type,
      )
    ) {
      toast.error("Only JPG, PNG, and WebP images are allowed");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be smaller than 10MB");
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    uploadOurStory.mutate(file);
    e.target.value = "";
  };

  const currentImage = previewUrl || ourStoryImage?.imageUrl || null;

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#0f172a]">Settings</h1>
        <p className="mt-1 text-sm text-[#64748b]">
          Manage storefront content, shipping rules, WhatsApp templates,
          invoice settings, and admin password.
        </p>
      </div>

      <nav className="flex w-full flex-wrap gap-1 rounded-xl border border-[#e2e8f0] bg-white p-1.5 shadow-sm">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? "bg-[#0f172a] text-white"
                : "text-[#64748b] hover:bg-[#f1f5f9]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "hero-banners" && <HeroBannersSettings />}

      {activeTab === "instagram-videos" && <InstagramVideosSettings />}

      {activeTab === "whatsapp-templates" && <WhatsAppTemplateSettings />}

      {activeTab === "our-story" && (
        <section className="space-y-4 rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-[#0f172a]">
              Our Story Image
            </h2>
            <p className="mt-1 text-sm text-[#64748b]">
              This image appears in the Our Story section on the homepage.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-[#f8fafc]">
            <div className="relative aspect-[4/3] w-full">
              {currentImage ? (
                <OptimizedImage
                  src={currentImage}
                  alt="Our Story"
                  fill
                  sizes="320px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[#94a3b8]">
                  {ourStoryLoading ? "Loading..." : "No image uploaded yet"}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={onImageSelect}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadOurStory.isPending}
              className="rounded-lg bg-[#0f172a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1e293b] disabled:opacity-60"
            >
              {uploadOurStory.isPending
                ? "Uploading..."
                : currentImage
                  ? "Update Image"
                  : "Add Image"}
            </button>
            {ourStoryImage?.imageUrl && (
              <button
                type="button"
                onClick={() => deleteOurStory.mutate()}
                disabled={deleteOurStory.isPending}
                className="rounded-lg border border-[#e2e8f0] px-5 py-2.5 text-sm font-medium text-[#475569] hover:bg-[#f8fafc] disabled:opacity-60"
              >
                {deleteOurStory.isPending ? "Deleting..." : "Delete Image"}
              </button>
            )}
          </div>
        </section>
      )}

      {activeTab === "announcement" && (
        <form
          onSubmit={onAnnouncementSubmit}
          className="space-y-5 rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm"
        >
          <div>
            <h2 className="text-lg font-semibold text-[#0f172a]">
              Announcement Bar
            </h2>
            <p className="mt-1 text-sm text-[#64748b]">
              Top banner on every store page. Both lines show on mobile and
              desktop.
            </p>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-[#e2e8f0] p-4">
            <input
              type="checkbox"
              checked={announcementEnabled}
              onChange={(e) => setAnnouncementEnabled(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[#cbd5e1]"
            />
            <div>
              <p className="text-sm font-medium text-[#0f172a]">
                Show announcement bar
              </p>
              <p className="mt-1 text-xs text-[#64748b]">
                Hide the bar entirely when turned off.
              </p>
            </div>
          </label>

          {announcementEnabled && (
            <>
              <div className="space-y-2">
                <label
                  htmlFor="announcementText"
                  className="text-sm font-medium text-[#334155]"
                >
                  Main message
                </label>
                <input
                  id="announcementText"
                  type="text"
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  disabled={announcementLoading}
                  placeholder="FREE SHIPPING on Orders Above Rs. 1999"
                  className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm focus:border-[#0f172a] focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="announcementSecondary"
                  className="text-sm font-medium text-[#334155]"
                >
                  Secondary message
                </label>
                <input
                  id="announcementSecondary"
                  type="text"
                  value={announcementSecondary}
                  onChange={(e) => setAnnouncementSecondary(e.target.value)}
                  disabled={announcementLoading}
                  placeholder="COD Available"
                  className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm focus:border-[#0f172a] focus:outline-none"
                />
                <p className="text-xs text-[#64748b]">
                  Leave empty to show only the main message.
                </p>
              </div>
              <div className="rounded-lg bg-charcoal-dark px-3 py-2 text-center text-xs tracking-wide text-white sm:text-sm">
                <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
                  <span>{announcementText || "…"}</span>
                  {announcementSecondary.trim() ? (
                    <>
                      <span className="text-white/50" aria-hidden>
                        |
                      </span>
                      <span>{announcementSecondary}</span>
                    </>
                  ) : null}
                </p>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={saveAnnouncement.isPending || announcementLoading}
            className="rounded-lg bg-[#0f172a] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveAnnouncement.isPending ? "Saving..." : "Save Announcement"}
          </button>
        </form>
      )}

      {activeTab === "shipping" && (
        <form
          onSubmit={onShippingSubmit}
          className="space-y-5 rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm"
        >
          <div>
            <h2 className="text-lg font-semibold text-[#0f172a]">
              India Shipping
            </h2>
            <p className="mt-1 text-sm text-[#64748b]">
              These rules apply only to orders shipped within India.
              International orders use Shiprocket fare quotes at checkout and
              are never free.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="shippingCharge"
              className="text-sm font-medium text-[#334155]"
            >
              Default Shipping Charge (Rs.)
            </label>
            <input
              id="shippingCharge"
              type="number"
              min="0"
              step="1"
              value={shippingCharge}
              onChange={(e) => setShippingCharge(e.target.value)}
              disabled={freeShippingEnabled || shippingLoading}
              className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm focus:border-[#0f172a] focus:outline-none disabled:bg-[#f8fafc] disabled:text-[#94a3b8]"
            />
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-[#e2e8f0] p-4">
            <input
              type="checkbox"
              checked={freeShippingEnabled}
              onChange={(e) => setFreeShippingEnabled(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[#cbd5e1]"
            />
            <div>
              <p className="text-sm font-medium text-[#0f172a]">
                Enable free shipping for all India orders
              </p>
              <p className="mt-1 text-xs text-[#64748b]">
                When enabled, all domestic India orders ship for free.
              </p>
            </div>
          </label>

          {!freeShippingEnabled && (
            <div className="space-y-2">
              <label
                htmlFor="freeShippingThreshold"
                className="text-sm font-medium text-[#334155]"
              >
                Free Shipping Above (Rs.)
              </label>
              <input
                id="freeShippingThreshold"
                type="number"
                min="0"
                step="1"
                value={freeShippingThreshold}
                onChange={(e) => setFreeShippingThreshold(e.target.value)}
                disabled={shippingLoading}
                className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm focus:border-[#0f172a] focus:outline-none"
              />
              <p className="text-xs text-[#64748b]">
                India orders at or above this amount get free shipping at
                checkout.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={saveShipping.isPending || shippingLoading}
            className="rounded-lg bg-[#0f172a] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveShipping.isPending ? "Saving..." : "Save Shipping"}
          </button>
        </form>
      )}

      {activeTab === "quick-pickup" && (
        <form
          onSubmit={onQuickPickupSubmit}
          className="space-y-6 rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm"
        >
          <div>
            <h2 className="text-lg font-semibold text-[#0f172a]">
              Quick delivery
            </h2>
            <p className="mt-1 text-sm text-[#64748b]">
              Pickup location, Instant acceptance hours (Asia/Kolkata), and
              holidays when Instant is off.
            </p>
          </div>

          <div className="space-y-4 border-b border-[#e2e8f0] pb-6">
            <h3 className="text-sm font-semibold text-[#0f172a]">
              Pickup coordinates
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="quickPickupLat"
                  className="text-sm font-medium text-[#334155]"
                >
                  Latitude
                </label>
                <input
                  id="quickPickupLat"
                  type="number"
                  step="any"
                  min={-90}
                  max={90}
                  value={quickPickupLat}
                  onChange={(e) => setQuickPickupLat(e.target.value)}
                  disabled={
                    quickPickupLoading ||
                    detectingLocation ||
                    saveQuickPickup.isPending
                  }
                  placeholder="17.423900"
                  className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm focus:border-[#0f172a] focus:outline-none disabled:bg-[#f8fafc]"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="quickPickupLng"
                  className="text-sm font-medium text-[#334155]"
                >
                  Longitude
                </label>
                <input
                  id="quickPickupLng"
                  type="number"
                  step="any"
                  min={-180}
                  max={180}
                  value={quickPickupLng}
                  onChange={(e) => setQuickPickupLng(e.target.value)}
                  disabled={
                    quickPickupLoading ||
                    detectingLocation ||
                    saveQuickPickup.isPending
                  }
                  placeholder="78.473800"
                  className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm focus:border-[#0f172a] focus:outline-none disabled:bg-[#f8fafc]"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={detectQuickPickupLocation}
              disabled={
                detectingLocation ||
                saveQuickPickup.isPending ||
                quickPickupLoading
              }
              className="rounded-lg border border-[#e2e8f0] bg-white px-4 py-2 text-sm font-semibold text-[#0f172a] transition-colors hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {detectingLocation ? "Detecting…" : "Detect location"}
            </button>
          </div>

          <div className="space-y-4 border-b border-[#e2e8f0] pb-6">
            <div>
              <h3 className="text-sm font-semibold text-[#0f172a]">
                Instant timings
              </h3>
              <p className="mt-1 text-xs text-[#64748b]">
                Customers can choose Instant only within this window (India
                time). Outside these hours Instant shows as not available.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="quickStart"
                  className="text-sm font-medium text-[#334155]"
                >
                  Start time
                </label>
                <input
                  id="quickStart"
                  type="time"
                  value={quickStart}
                  onChange={(e) => setQuickStart(e.target.value)}
                  disabled={quickPickupLoading || saveQuickPickup.isPending}
                  className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm focus:border-[#0f172a] focus:outline-none disabled:bg-[#f8fafc]"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="quickEnd"
                  className="text-sm font-medium text-[#334155]"
                >
                  End time
                </label>
                <input
                  id="quickEnd"
                  type="time"
                  value={quickEnd}
                  onChange={(e) => setQuickEnd(e.target.value)}
                  disabled={quickPickupLoading || saveQuickPickup.isPending}
                  className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm focus:border-[#0f172a] focus:outline-none disabled:bg-[#f8fafc]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[#0f172a]">
                Quick holidays
              </h3>
              <p className="mt-1 text-xs text-[#64748b]">
                On these dates Instant is off all day. Standard delivery still
                works.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-2">
                <label
                  htmlFor="holidayInput"
                  className="text-sm font-medium text-[#334155]"
                >
                  Add holiday
                </label>
                <input
                  id="holidayInput"
                  type="date"
                  value={holidayInput}
                  onChange={(e) => setHolidayInput(e.target.value)}
                  disabled={quickPickupLoading || saveQuickPickup.isPending}
                  className="h-10 rounded-lg border border-[#e2e8f0] px-3 text-sm focus:border-[#0f172a] focus:outline-none disabled:bg-[#f8fafc]"
                />
              </div>
              <button
                type="button"
                disabled={
                  !holidayInput ||
                  quickPickupLoading ||
                  saveQuickPickup.isPending ||
                  quickHolidays.includes(holidayInput)
                }
                onClick={() => {
                  if (!/^\d{4}-\d{2}-\d{2}$/.test(holidayInput)) return;
                  setQuickHolidays((prev) => [...prev, holidayInput].sort());
                  setHolidayInput("");
                }}
                className="h-10 rounded-lg border border-[#e2e8f0] bg-white px-4 text-sm font-semibold text-[#0f172a] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Add
              </button>
            </div>
            {quickHolidays.length === 0 ? (
              <p className="text-xs text-[#94a3b8]">No Quick holidays set.</p>
            ) : (
              <ul className="space-y-2">
                {quickHolidays.map((day) => (
                  <li
                    key={day}
                    className="flex items-center justify-between rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm text-[#0f172a]"
                  >
                    <span>{day}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setQuickHolidays((prev) =>
                          prev.filter((d) => d !== day),
                        )
                      }
                      disabled={saveQuickPickup.isPending}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="submit"
            disabled={
              saveQuickPickup.isPending ||
              quickPickupLoading ||
              detectingLocation
            }
            className="rounded-lg bg-[#0f172a] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveQuickPickup.isPending ? "Saving…" : "Save Quick settings"}
          </button>
        </form>
      )}

      {activeTab === "signature" && (
        <section className="space-y-4 rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-[#0f172a]">
              Invoice Signature
            </h2>
            <p className="mt-1 text-sm text-[#64748b]">
              Draw your signature below. It will appear at the bottom-right of
              printed invoices.
            </p>
          </div>

          <InvoiceSignaturePad
            savedSignature={invoiceSignature?.imageUrl ?? null}
            isLoading={signatureLoading}
            isSaving={saveSignature.isPending}
            isDeleting={deleteSignature.isPending}
            onSave={(dataUrl) => saveSignature.mutate(dataUrl)}
            onDelete={() => deleteSignature.mutate()}
          />
        </section>
      )}

      {activeTab === "password" && <AdminPasswordSettings />}
    </div>
  );
}
