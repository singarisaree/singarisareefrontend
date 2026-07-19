'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Mail, Send, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  adminEmailMarketingService,
  adminMarketingService,
} from '@/services/admin.service';

interface EmailMarketingPanelProps {
  selectedIds: Set<string>;
  customerCount: number;
}

export function EmailMarketingPanel({
  selectedIds,
  customerCount,
}: EmailMarketingPanelProps) {
  const queryClient = useQueryClient();
  const initialized = useRef(false);
  const [templateKey, setTemplateKey] = useState('');
  const [subject, setSubject] = useState('');
  const [heading, setHeading] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [previewName, setPreviewName] = useState('Priya');
  const [sendToAll, setSendToAll] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ['admin-email-marketing-templates'],
    queryFn: adminEmailMarketingService.getTemplates,
  });

  useEffect(() => {
    if (initialized.current || templates.length === 0) return;
    const first = templates[0];
    initialized.current = true;
    setTemplateKey(first.key);
    setSubject(first.subject);
    setHeading(first.heading);
    setBody(first.body);
  }, [templates]);

  const audienceReady = sendToAll || selectedIds.size > 0;
  const { data: eligibility, isFetching: eligibilityLoading } = useQuery({
    queryKey: [
      'admin-email-marketing-eligibility',
      sendToAll,
      sendToAll ? 'all' : Array.from(selectedIds).sort().join(','),
    ],
    queryFn: () =>
      adminEmailMarketingService.eligibility({
        sendToAll,
        customerIds: sendToAll ? undefined : Array.from(selectedIds),
      }),
    enabled: audienceReady,
  });

  const previewReady = Boolean(subject.trim() && heading.trim() && body.trim());
  const { data: preview, isFetching: previewLoading } = useQuery({
    queryKey: ['admin-email-marketing-preview', subject, heading, body, imageUrl, previewName],
    queryFn: () =>
      adminEmailMarketingService.preview({
        subject,
        heading,
        body,
        imageUrl: imageUrl || undefined,
        sampleName: previewName,
      }),
    enabled: previewReady,
    staleTime: 30_000,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['admin-email-marketing-campaigns'],
    queryFn: adminEmailMarketingService.getCampaigns,
    refetchInterval: 5000,
  });

  const sendCampaign = useMutation({
    mutationFn: () =>
      adminEmailMarketingService.send({
        templateKey,
        subject: subject.trim(),
        heading: heading.trim(),
        body: body.trim(),
        imageUrl: imageUrl || undefined,
        sendToAll,
        customerIds: sendToAll ? undefined : Array.from(selectedIds),
      }),
    onSuccess: (result) => {
      toast.success(`Email campaign queued for ${result.recipientCount} recipient(s)`);
      queryClient.invalidateQueries({ queryKey: ['admin-email-marketing-campaigns'] });
    },
    onError: () => toast.error('Could not queue email campaign. Check SMTP settings and recipients.'),
  });

  const applyTemplate = (key: string) => {
    const template = templates.find((item) => item.key === key);
    if (!template) return;
    setTemplateKey(template.key);
    setSubject(template.subject);
    setHeading(template.heading);
    setBody(template.body);
  };

  const uploadImage = async (file: File | null) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Choose a JPG, PNG, or WebP image');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be smaller than 10MB');
      return;
    }
    setImageUploading(true);
    try {
      const result = await adminMarketingService.uploadImage(file);
      setImageUrl(result.imageUrl);
      toast.success('Campaign image uploaded');
    } catch {
      toast.error('Image upload failed');
    } finally {
      setImageUploading(false);
    }
  };

  const eligibleCount = eligibility?.eligibleCount ?? 0;
  const canSend =
    previewReady &&
    audienceReady &&
    !eligibilityLoading &&
    eligibleCount > 0 &&
    !sendCampaign.isPending;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="space-y-6">
        <section className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-[#0f172a]" />
            <h2 className="text-base font-semibold text-[#0f172a]">Email Templates</h2>
          </div>
          <p className="mt-1 text-sm text-[#64748b]">
            Choose a starting point, then personalize it. Use {'{{name}}'} for the customer name.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {templates.map((template) => (
              <button
                key={template.key}
                type="button"
                onClick={() => applyTemplate(template.key)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  templateKey === template.key
                    ? 'border-[#0f172a] bg-[#f8fafc]'
                    : 'border-[#e2e8f0] hover:border-[#cbd5e1]'
                }`}
              >
                <p className="text-sm font-semibold text-[#0f172a]">{template.name}</p>
                <p className="mt-1 text-xs text-[#64748b]">{template.description}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-[#0f172a]">Compose Email</h2>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-[#334155]">Subject</span>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={200}
              className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm"
              placeholder="Email subject"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-[#334155]">Heading</span>
            <input
              value={heading}
              onChange={(event) => setHeading(event.target.value)}
              maxLength={200}
              className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm"
              placeholder="Main email heading"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-[#334155]">Email body</span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={10000}
              rows={8}
              className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm"
              placeholder="Write the email. Use {{name}} for personalization."
            />
          </label>

          <div className="space-y-2">
            <span className="text-sm font-medium text-[#334155]">Image (optional)</span>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#cbd5e1] px-4 py-3 text-sm text-[#475569] hover:bg-[#f8fafc]">
              {imageUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {imageUploading ? 'Uploading...' : 'Choose campaign image'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={imageUploading}
                onChange={(event) => void uploadImage(event.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
            {imageUrl ? (
              <div className="flex items-center justify-between rounded-lg bg-[#f8fafc] px-3 py-2 text-xs text-[#64748b]">
                <span>Image attached</span>
                <button type="button" onClick={() => setImageUrl('')} aria-label="Remove image">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-[#334155]">Preview name</span>
            <input
              value={previewName}
              onChange={(event) => setPreviewName(event.target.value)}
              className="h-10 w-full max-w-xs rounded-lg border border-[#e2e8f0] px-3 text-sm"
            />
          </label>

          <div className="space-y-3 border-t border-[#e2e8f0] pt-4">
            <label className="flex items-center gap-2 text-sm text-[#334155]">
              <input
                type="checkbox"
                checked={sendToAll}
                onChange={(event) => setSendToAll(event.target.checked)}
              />
              Send to all marketing-enabled customers ({customerCount})
            </label>
            {!sendToAll ? (
              <p className="text-sm text-[#64748b]">
                {selectedIds.size
                  ? `${selectedIds.size} selected customer(s)`
                  : 'Select customers in the Users tab first'}
              </p>
            ) : null}
            {audienceReady ? (
              <p className="rounded-lg bg-[#f8fafc] px-3 py-2 text-sm text-[#475569]">
                {eligibilityLoading
                  ? 'Checking email recipients...'
                  : `${eligibleCount} eligible email(s) · ${eligibility?.skippedCount || 0} skipped`}
              </p>
            ) : null}
            <button
              type="button"
              disabled={!canSend}
              onClick={() => {
                if (
                  window.confirm(
                    `Queue this email campaign for ${eligibleCount} eligible recipient(s)?`,
                  )
                ) {
                  sendCampaign.mutate();
                }
              }}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#7f1d1d] text-sm font-semibold text-white hover:bg-[#681717] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sendCampaign.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Queue Email Campaign
            </button>
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[#0f172a]">Email Preview</h2>
            {previewLoading ? <Loader2 className="h-4 w-4 animate-spin text-[#64748b]" /> : null}
          </div>
          <p className="mt-1 truncate text-xs text-[#64748b]">
            Subject: {preview?.subject || subject || '—'}
          </p>
          <div className="mt-4 overflow-hidden rounded-lg border border-[#e2e8f0] bg-[#f6f1ea]">
            {preview?.html ? (
              <iframe
                title="Email campaign preview"
                srcDoc={preview.html}
                sandbox=""
                className="h-[620px] w-full bg-white"
              />
            ) : (
              <div className="flex h-80 items-center justify-center text-sm text-[#94a3b8]">
                Enter a subject, heading, and body to preview the email.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-[#0f172a]">Email Campaign History</h2>
          <div className="mt-4 space-y-3">
            {campaigns.length === 0 ? (
              <p className="text-sm text-[#94a3b8]">No email campaigns yet.</p>
            ) : (
              campaigns.map((campaign) => (
                <div key={campaign.id} className="rounded-lg border border-[#e2e8f0] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[#0f172a]">{campaign.subject}</p>
                      <p className="mt-1 text-xs text-[#64748b]">
                        {new Date(campaign.createdAt).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#f1f5f9] px-2.5 py-1 text-[11px] font-semibold text-[#475569]">
                      {campaign.status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded bg-[#f8fafc] p-2">
                      <strong className="block text-[#0f172a]">{campaign.recipientCount}</strong>
                      Recipients
                    </div>
                    <div className="rounded bg-emerald-50 p-2 text-emerald-700">
                      <strong className="block">{campaign.sentCount}</strong>
                      Sent
                    </div>
                    <div className="rounded bg-red-50 p-2 text-red-700">
                      <strong className="block">{campaign.failedCount}</strong>
                      Failed
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
