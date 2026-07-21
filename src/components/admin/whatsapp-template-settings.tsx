"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminSettingsService,
  type WhatsAppTemplateKind,
  type WhatsAppTemplateRecord,
} from "@/services/admin.service";
import { OptimizedImage } from "@/components/ui/optimized-image";

const TITLES: Record<WhatsAppTemplateKind, string> = {
  order_placed: "Order placed",
  order_payment_pending: "Payment pending",
  order_confirmed: "Order confirmed",
  order_ready_to_ship: "Ready to ship",
  order_shipped: "Order shipped",
  order_in_transit: "Order in transit",
  order_delivered: "Order delivered",
  order_returned: "Order returned",
  order_cancelled: "Order cancelled",
  order_failed: "Order failed",
  order_rto: "Returned to origin",
  order_refunded: "Order refunded",
  return_requested: "Return requested",
  return_accepted: "Return accepted",
  return_rejected: "Return rejected",
  return_out_for_pickup: "Return out for pickup",
  return_pickup_cancelled: "Return pickup cancelled",
  return_picked_up: "Return picked up",
  return_completed: "Return completed",
  refund_coupon_issued: "Return coupon issued",
  customer_welcome: "First-login welcome",
  marketing_text: "Text marketing",
  marketing_image: "Image marketing",
};

const STATUS_STYLES: Record<WhatsAppTemplateRecord["status"], string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-700",
  PAUSED: "bg-orange-100 text-orange-800",
  DISABLED: "bg-slate-200 text-slate-700",
  IN_APPEAL: "bg-blue-100 text-blue-800",
  DELETED: "bg-slate-200 text-slate-600",
};

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;
    if (response?.data?.message) return response.data.message;
  }
  return error instanceof Error ? error.message : fallback;
}

function renderPreview(text: string, examples: string[]): string {
  return text.replace(/\{\{(\d+)\}\}/g, (_match, index: string) => {
    return examples[Number(index) - 1] || `{{${index}}}`;
  });
}

function validateTemplate(template: WhatsAppTemplateRecord): string | null {
  if (!/^[a-z0-9_]+$/.test(template.name)) {
    return "Template name must use lowercase letters, numbers, and underscores only";
  }
  const placeholders = [...template.body.matchAll(/\{\{(\d+)\}\}/g)].map(
    (match) => Number(match[1]),
  );
  const expected = template.variableLabels.map((_, index) => index + 1);
  if (
    placeholders.length !== expected.length ||
    placeholders.some((value, index) => value !== expected[index])
  ) {
    return `Body variables must appear once in this order: ${expected
      .map((value) => `{{${value}}}`)
      .join(", ")}`;
  }
  if (template.examples.some((example) => !example.trim())) {
    return "Every variable needs a sample value for Meta review";
  }
  if (template.kind === "marketing_image" && !template.headerHandle) {
    return "Upload a sample image before submitting the image template";
  }
  return null;
}

export function WhatsAppTemplateSettings() {
  const queryClient = useQueryClient();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageTarget, setImageTarget] =
    useState<WhatsAppTemplateKind>("marketing_image");
  const [templates, setTemplates] = useState<WhatsAppTemplateRecord[]>([]);
  const [openKind, setOpenKind] = useState<WhatsAppTemplateKind | null>(null);

  const query = useQuery({
    queryKey: ["admin-whatsapp-templates"],
    queryFn: adminSettingsService.getWhatsAppTemplates,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!query.data) return;
    setTemplates((current) => {
      const currentSnapshot = JSON.stringify(current);
      const incomingSnapshot = JSON.stringify(query.data);
      return currentSnapshot === incomingSnapshot ? current : query.data;
    });
  }, [query.data]);

  useEffect(() => {
    if (!openKind) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenKind(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [openKind]);

  const replaceTemplate = (updated: WhatsAppTemplateRecord) => {
    setTemplates((current) =>
      current.map((template) =>
        template.kind === updated.kind ? updated : template,
      ),
    );
    void queryClient.invalidateQueries({
      queryKey: ["admin-whatsapp-templates"],
    });
  };

  const saveDraft = useMutation({
    mutationFn: (template: WhatsAppTemplateRecord) =>
      adminSettingsService.saveWhatsAppTemplate(template.kind, template),
    onSuccess: (template) => {
      replaceTemplate(template);
      toast.success("Template draft saved");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Could not save template draft")),
  });

  const submitTemplate = useMutation({
    mutationFn: async (template: WhatsAppTemplateRecord) => {
      const validation = validateTemplate(template);
      if (validation) throw new Error(validation);
      await adminSettingsService.saveWhatsAppTemplate(template.kind, template);
      return adminSettingsService.submitWhatsAppTemplate(template.kind);
    },
    onSuccess: (template) => {
      replaceTemplate(template);
      toast.success("Template submitted to Meta for review");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Meta template submission failed")),
  });

  const syncTemplate = useMutation({
    mutationFn: adminSettingsService.syncWhatsAppTemplate,
    onSuccess: (template) => {
      replaceTemplate(template);
      toast.success(`Meta status: ${template.status}`);
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Could not refresh Meta status")),
  });

  const toggleActive = useMutation({
    mutationFn: ({
      kind,
      isActive,
    }: {
      kind: WhatsAppTemplateKind;
      isActive: boolean;
    }) => adminSettingsService.setWhatsAppTemplateActive(kind, isActive),
    onSuccess: (template) => {
      replaceTemplate(template);
      toast.success(
        template.isActive ? "Template activated" : "Template deactivated",
      );
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Could not change template activation")),
  });

  const uploadImage = useMutation({
    mutationFn: async ({
      template,
      file,
    }: {
      template: WhatsAppTemplateRecord;
      file: File;
    }) => {
      await adminSettingsService.saveWhatsAppTemplate(template.kind, template);
      return adminSettingsService.uploadWhatsAppTemplateImage(
        template.kind,
        file,
      );
    },
    onSuccess: (template) => {
      replaceTemplate(template);
      toast.success("Sample image uploaded to Meta");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Sample image upload failed")),
  });

  const updateTemplate = (
    kind: WhatsAppTemplateKind,
    update: Partial<WhatsAppTemplateRecord>,
  ) => {
    setTemplates((current) =>
      current.map((template) =>
        template.kind === kind
          ? { ...template, ...update, status: "DRAFT", isActive: false }
          : template,
      ),
    );
  };

  const onImageSelected = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      toast.error("Meta template samples must be JPG or PNG");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Sample image must be smaller than 5MB");
      return;
    }
    const headerPreviewUrl = URL.createObjectURL(file);
    updateTemplate(imageTarget, { headerPreviewUrl });
    const template = templates.find((item) => item.kind === imageTarget);
    if (template) {
      uploadImage.mutate({
        template: { ...template, headerPreviewUrl, status: "DRAFT" },
        file,
      });
    }
  };

  if (query.isLoading) {
    return (
      <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 text-sm text-[#64748b]">
        Loading WhatsApp templates…
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Could not load WhatsApp templates.
      </div>
    );
  }

  const templateGroups = [
    {
      title: "Order Status",
      templates: templates.filter((template) =>
        template.kind.startsWith("order_"),
      ),
    },
    {
      title: "Return Request",
      templates: templates.filter((template) =>
        template.kind.startsWith("return_"),
      ),
    },
    {
      title: "Refund Coupon",
      templates: templates.filter((template) =>
        template.kind.startsWith("refund_coupon_"),
      ),
    },
    {
      title: "Customer Account",
      templates: templates.filter((template) =>
        template.kind.startsWith("customer_"),
      ),
    },
    {
      title: "Marketing",
      templates: templates.filter((template) =>
        template.kind.startsWith("marketing_"),
      ),
    },
  ];

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#0f172a]">
          WhatsApp template designer
        </h2>
        <p className="mt-1 text-sm text-[#64748b]">
          Save drafts here, then submit them directly to Meta. Meta must approve
          a template before it can be activated for customer messages.
        </p>
        <p className="mt-3 rounded-lg bg-[#f8fafc] px-3 py-2 text-xs text-[#475569]">
          Access tokens and account IDs remain protected on the server. Template
          text and approval status are stored in Settings.
        </p>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        className="hidden"
        onChange={(event) => {
          onImageSelected(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {templateGroups.map((group) => (
        <div key={group.title} className="space-y-3">
          <h3 className="text-base font-semibold text-[#0f172a]">
            {group.title}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {group.templates.map((template) => (
              <button
                key={template.kind}
                type="button"
                onClick={() => setOpenKind(template.kind)}
                className="group rounded-xl border border-[#e2e8f0] bg-white p-5 text-left shadow-sm transition hover:border-[#94a3b8] hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[#0f172a]">
                      {TITLES[template.kind]}
                    </h3>
                    <p className="mt-1 text-xs text-[#64748b]">
                      {template.category} · {template.language}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[template.status]}`}
                    >
                      {template.status.replace("_", " ")}
                    </span>
                    {template.status === "APPROVED" ? (
                      <span
                        className={`text-xs font-semibold ${
                          template.isActive
                            ? "text-emerald-700"
                            : "text-slate-500"
                        }`}
                      >
                        {template.isActive ? "Active" : "Inactive"}
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-[#475569]">
                  {renderPreview(template.body, template.examples)}
                </p>
                <span className="mt-4 inline-flex text-sm font-semibold text-[#0f172a] group-hover:underline">
                  Open full view
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {openKind ? (
        <div
          className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`${TITLES[openKind]} template editor`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpenKind(null);
          }}
        >
          {templates
            .filter((template) => template.kind === openKind)
            .map((template) => {
              const locked =
                template.status === "PENDING" || template.status === "APPROVED";
              const busy =
                (saveDraft.isPending &&
                  saveDraft.variables?.kind === template.kind) ||
                (submitTemplate.isPending &&
                  submitTemplate.variables?.kind === template.kind) ||
                (syncTemplate.isPending &&
                  syncTemplate.variables === template.kind) ||
                (toggleActive.isPending &&
                  toggleActive.variables?.kind === template.kind) ||
                (uploadImage.isPending &&
                  uploadImage.variables?.template.kind === template.kind);
              const previewBody = renderPreview(
                template.body,
                template.examples,
              );

              return (
                <article
                  key={template.kind}
                  className="mx-auto min-h-[calc(100vh-3rem)] w-full max-w-5xl space-y-5 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-xl sm:p-7"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[#0f172a]">
                        {TITLES[template.kind]}
                      </h3>
                      <p className="mt-1 text-xs text-[#64748b]">
                        Meta category: {template.category}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {template.status === "APPROVED" ? (
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            template.isActive
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {template.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      ) : null}
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[template.status]}`}
                      >
                        {template.status.replace("_", " ")}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpenKind(null)}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e2e8f0] text-xl leading-none text-[#475569] hover:bg-[#f1f5f9]"
                        aria-label="Close template editor"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {template.rejectionReason ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      Meta rejection: {template.rejectionReason}
                    </div>
                  ) : null}

                  {locked ? (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      {template.status === "PENDING"
                        ? "This template is under Meta review and cannot be edited or resubmitted."
                        : `This approved template is ${
                            template.isActive ? "active" : "inactive"
                          }. Use the control below to change whether WhatsApp messages are sent.`}
                    </p>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5 text-sm font-medium text-[#334155]">
                      Template name
                      <input
                        value={template.name}
                        disabled={locked || busy}
                        onChange={(event) =>
                          updateTemplate(template.kind, {
                            name: event.target.value
                              .toLowerCase()
                              .replace(/\s+/g, "_"),
                          })
                        }
                        className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 font-normal focus:border-[#0f172a] focus:outline-none disabled:bg-[#f8fafc]"
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium text-[#334155]">
                      Language
                      <input
                        value={template.language}
                        disabled={locked || busy}
                        onChange={(event) =>
                          updateTemplate(template.kind, {
                            language: event.target.value,
                          })
                        }
                        placeholder="en"
                        className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 font-normal focus:border-[#0f172a] focus:outline-none disabled:bg-[#f8fafc]"
                      />
                    </label>
                  </div>

                  {template.kind === "marketing_image" ? (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-[#334155]">
                        Image header sample
                      </p>
                      {template.headerPreviewUrl ? (
                        <div className="relative aspect-[2/1] max-w-md overflow-hidden rounded-lg border border-[#e2e8f0]">
                          <OptimizedImage
                            src={template.headerPreviewUrl}
                            alt="WhatsApp template sample"
                            fill
                            sizes="448px"
                            className="object-cover"
                          />
                        </div>
                      ) : null}
                      <button
                        type="button"
                        disabled={locked || busy}
                        onClick={() => {
                          setImageTarget(template.kind);
                          imageInputRef.current?.click();
                        }}
                        className="rounded-lg border border-[#cbd5e1] px-4 py-2 text-sm font-semibold text-[#334155] hover:bg-[#f8fafc] disabled:opacity-50"
                      >
                        {uploadImage.isPending &&
                        uploadImage.variables?.template.kind === template.kind
                          ? "Uploading to Meta…"
                          : template.headerHandle
                            ? "Replace sample image"
                            : "Upload sample image"}
                      </button>
                    </div>
                  ) : (
                    <label className="block space-y-1.5 text-sm font-medium text-[#334155]">
                      Header
                      <input
                        value={template.headerText}
                        maxLength={60}
                        disabled={locked || busy}
                        onChange={(event) =>
                          updateTemplate(template.kind, {
                            headerText: event.target.value,
                          })
                        }
                        className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 font-normal focus:border-[#0f172a] focus:outline-none disabled:bg-[#f8fafc]"
                      />
                    </label>
                  )}

                  <label className="block space-y-1.5 text-sm font-medium text-[#334155]">
                    Message body
                    <textarea
                      value={template.body}
                      rows={6}
                      maxLength={1024}
                      disabled={locked || busy}
                      onChange={(event) =>
                        updateTemplate(template.kind, {
                          body: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-[#e2e8f0] p-3 font-normal leading-relaxed focus:border-[#0f172a] focus:outline-none disabled:bg-[#f8fafc]"
                    />
                  </label>

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-[#334155]">
                      Required variables and samples
                    </p>
                    {template.variableLabels.map((label, index) => (
                      <div
                        key={label}
                        className="grid items-center gap-2 sm:grid-cols-[160px_1fr]"
                      >
                        <span className="text-xs font-semibold text-[#64748b]">
                          {`{{${index + 1}}}`} — {label}
                        </span>
                        <input
                          value={template.examples[index] || ""}
                          disabled={locked || busy}
                          onChange={(event) => {
                            const examples = [...template.examples];
                            examples[index] = event.target.value;
                            updateTemplate(template.kind, { examples });
                          }}
                          className="h-9 rounded-lg border border-[#e2e8f0] px-3 text-sm focus:border-[#0f172a] focus:outline-none disabled:bg-[#f8fafc]"
                        />
                      </div>
                    ))}
                  </div>

                  <label className="block space-y-1.5 text-sm font-medium text-[#334155]">
                    Footer
                    <input
                      value={template.footer}
                      maxLength={60}
                      disabled={locked || busy}
                      onChange={(event) =>
                        updateTemplate(template.kind, {
                          footer: event.target.value,
                        })
                      }
                      className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 font-normal focus:border-[#0f172a] focus:outline-none disabled:bg-[#f8fafc]"
                    />
                  </label>

                  <div className="overflow-hidden rounded-xl border border-[#d8e8dc] bg-[#efeae2]">
                    <div className="bg-[#075e54] px-4 py-2 text-xs font-semibold text-white">
                      WhatsApp preview
                    </div>
                    <div className="p-4">
                      <div className="max-w-lg rounded-lg bg-white p-3 text-sm text-[#1f2937] shadow-sm">
                        {template.kind === "marketing_image" &&
                        template.headerPreviewUrl ? (
                          <div className="relative mb-3 aspect-[2/1] overflow-hidden rounded-md">
                            <OptimizedImage
                              src={template.headerPreviewUrl}
                              alt=""
                              fill
                              sizes="512px"
                              className="object-cover"
                            />
                          </div>
                        ) : template.headerText ? (
                          <p className="mb-2 font-semibold">
                            {template.headerText}
                          </p>
                        ) : null}
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {previewBody}
                        </p>
                        {template.footer ? (
                          /^https?:\/\//.test(template.footer) ? (
                            <a
                              href={template.footer}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 block text-xs font-medium text-blue-600 underline"
                            >
                              {template.footer}
                            </a>
                          ) : (
                            <p className="mt-2 text-xs text-[#6b7280]">
                              {template.footer}
                            </p>
                          )
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={locked || busy}
                      onClick={() => saveDraft.mutate(template)}
                      className="rounded-lg border border-[#cbd5e1] px-4 py-2 text-sm font-semibold text-[#334155] hover:bg-[#f8fafc] disabled:opacity-50"
                    >
                      Save draft
                    </button>
                    <button
                      type="button"
                      disabled={locked || busy}
                      onClick={() => submitTemplate.mutate(template)}
                      className="rounded-lg bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e293b] disabled:opacity-50"
                    >
                      Submit to Meta
                    </button>
                    {template.status !== "DRAFT" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => syncTemplate.mutate(template.kind)}
                        className="rounded-lg border border-[#cbd5e1] px-4 py-2 text-sm font-semibold text-[#334155] hover:bg-[#f8fafc] disabled:opacity-50"
                      >
                        Refresh status
                      </button>
                    ) : null}
                    {template.status === "APPROVED" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          toggleActive.mutate({
                            kind: template.kind,
                            isActive: !template.isActive,
                          })
                        }
                        className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                          template.isActive
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                      >
                        {template.isActive ? "Deactivate" : "Activate"}
                      </button>
                    ) : null}
                  </div>

                  {template.lastSyncedAt ? (
                    <p className="text-xs text-[#94a3b8]">
                      Last checked:{" "}
                      {new Date(template.lastSyncedAt).toLocaleString("en-IN")}
                    </p>
                  ) : null}
                </article>
              );
            })}
        </div>
      ) : null}
    </section>
  );
}
