'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { OptimizedImage } from '@/components/ui/optimized-image';
import Link from 'next/link';
import {
  Users,
  RefreshCw,
  UserPlus,
  MessageCircle,
  Mail,
  Send,
  Loader2,
  X,
  Eye,
  CheckSquare,
  Square,
  LinkIcon,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  adminCustomerService,
  adminMarketingService,
  adminSettingsService,
  type WhatsAppTemplateRecord,
} from '@/services/admin.service';
import type { StoreCustomer } from '@/types';
import { StatCard } from '@/components/admin/stat-card';
import { StatusBadge, marketingMessageVariant, orderStatusVariant } from '@/components/admin/status-badge';
import {
  DataTableToolbar,
  FilterSelect,
  AdminTable,
  AdminTableCard,
  AdminTableHead,
  AdminTh,
  AdminTd,
} from '@/components/admin/data-table';
import { formatDate, formatPrice, getOrderStatusLabel, formatShortOrderNumber } from '@/lib/utils';
import { useAdminPagination } from '@/lib/use-admin-pagination';
import { useResetPageOnFilterChange } from '@/lib/use-reset-page-on-filter-change';
import {
  useAdminSearchParam,
  useAdminEnumParam,
  useAdminDateRangeParam,
} from '@/lib/use-admin-list-filters';
import { AdminPagination } from '@/components/admin/admin-pagination';
import { renderMarketingPreview } from '@/lib/marketing-templates';
import { resolveStorefrontImageUrl } from '@/lib/image';
import { EmailMarketingPanel } from '@/components/admin/email-marketing-panel';

type Tab = 'users' | 'marketing' | 'email-marketing';

const MARKETING_TEMPLATE_KINDS = ['marketing_text', 'marketing_image'] as const;
type MarketingTemplateKind = (typeof MARKETING_TEMPLATE_KINDS)[number];

const MARKETING_TEMPLATE_TITLES: Record<MarketingTemplateKind, string> = {
  marketing_text: 'Text marketing',
  marketing_image: 'Image marketing',
};

function applyWhatsAppTemplateExamples(template: WhatsAppTemplateRecord) {
  return {
    heading: template.examples[1] ?? '',
    story: template.examples[2] ?? '',
    campaignLink: template.examples[3] ?? '',
    previewName: template.examples[0] ?? 'Priya',
  };
}

const SOURCE_VALUES = ['ALL', 'ORDER', 'VIP', 'MANUAL'] as const;

function customerSourceLabel(source: StoreCustomer['source']) {
  if (source === 'ORDER') return 'Order';
  if (source === 'VIP') return 'VIP';
  return 'Manual';
}

function customerSourceVariant(source: StoreCustomer['source']): 'active' | 'pending' | 'neutral' {
  if (source === 'ORDER') return 'active';
  if (source === 'VIP') return 'pending';
  return 'neutral';
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('users');
  const { search, debouncedSearch, onSearchChange } = useAdminSearchParam();
  const [sourceFilter, setSourceFilter] = useAdminEnumParam('source', SOURCE_VALUES, 'ALL');
  const { dateRange, onDateRangeChange, dateParams } = useAdminDateRangeParam();
  const { page, setPage, pageSize, setPageSize, resetPage } = useAdminPagination();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', phone: '', email: '', notes: '' });

  const marketingInitialized = useRef(false);
  const [selectedTemplateKind, setSelectedTemplateKind] =
    useState<MarketingTemplateKind>('marketing_text');
  const [heading, setHeading] = useState('');
  const [story, setStory] = useState('');
  const [campaignLink, setCampaignLink] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [previewName, setPreviewName] = useState('Priya');
  const [sendToAll, setSendToAll] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  useResetPageOnFilterChange(resetPage, debouncedSearch, sourceFilter, dateParams.startDate, dateParams.endDate);

  const { data: customersResult, isLoading } = useQuery({
    queryKey: ['admin-customers', debouncedSearch, sourceFilter, page, pageSize, dateParams],
    queryFn: () =>
      adminCustomerService.list({
        search: debouncedSearch,
        source: sourceFilter,
        page: String(page),
        limit: String(pageSize),
        ...dateParams,
      }),
    placeholderData: keepPreviousData,
  });

  const customers = useMemo(
    () => customersResult?.data ?? [],
    [customersResult?.data],
  );
  const customersMeta = customersResult?.meta;

  const { data: customerDetail } = useQuery({
    queryKey: ['admin-customer', detailId],
    queryFn: () => adminCustomerService.getById(detailId!),
    enabled: !!detailId,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['admin-marketing-campaigns'],
    queryFn: () => adminMarketingService.getCampaigns(),
    enabled: tab === 'marketing',
  });

  const { data: whatsAppTemplates = [] } = useQuery({
    queryKey: ['admin-whatsapp-templates'],
    queryFn: () => adminSettingsService.getWhatsAppTemplates(),
    enabled: tab === 'marketing',
  });

  const marketingWhatsAppTemplates = useMemo(
    () =>
      MARKETING_TEMPLATE_KINDS.map((kind) =>
        whatsAppTemplates.find((template) => template.kind === kind),
      ).filter((template): template is WhatsAppTemplateRecord => Boolean(template)),
    [whatsAppTemplates],
  );

  useEffect(() => {
    if (marketingInitialized.current || marketingWhatsAppTemplates.length === 0) return;
    const first = marketingWhatsAppTemplates[0];
    marketingInitialized.current = true;
    setSelectedTemplateKind(first.kind as MarketingTemplateKind);
    const examples = applyWhatsAppTemplateExamples(first);
    setHeading(examples.heading);
    setStory(examples.story);
    setCampaignLink(examples.campaignLink);
    setPreviewName(examples.previewName);
  }, [marketingWhatsAppTemplates]);

  const selectedMetaTemplate = whatsAppTemplates.find(
    (template) => template.kind === selectedTemplateKind,
  );
  const metaTemplateAvailable =
    selectedMetaTemplate?.status === 'APPROVED' && selectedMetaTemplate.isActive;

  const createMutation = useMutation({
    mutationFn: () =>
      adminCustomerService.create({
        name: newUser.name.trim(),
        phone: newUser.phone.trim(),
        email: newUser.email.trim() || undefined,
        notes: newUser.notes.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('User added');
      setShowAddModal(false);
      setNewUser({ name: '', phone: '', email: '', notes: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
    },
    onError: () => toast.error('Failed to add user — phone may already exist'),
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      adminMarketingService.send({
        templateKey: selectedTemplateKind,
        heading,
        story,
        campaignLink: campaignLink.trim(),
        imageUrl: imageUrl || undefined,
        sendToAll,
        customerIds: sendToAll ? undefined : Array.from(selectedIds),
      }),
    onSuccess: (result) => {
      toast.success(
        `Sent ${result.sentCount} messages` +
          (result.failedCount ? ` (${result.failedCount} failed)` : ''),
      );
      queryClient.invalidateQueries({ queryKey: ['admin-marketing-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message || 'Failed to send marketing messages');
    },
  });

  const stats = useMemo(() => {
    const withOrders = customers.filter((c) => (c.orderCount ?? 0) > 0).length;
    const manual = customers.filter((c) => c.source === 'MANUAL').length;
    const vip = customers.filter((c) => c.source === 'VIP').length;
    return {
      total: customersMeta?.total ?? customers.length,
      withOrders,
      manual,
      vip,
    };
  }, [customers, customersMeta?.total]);

  const previewMessage = renderMarketingPreview(heading, story, previewName);
  const previewImageSrc = imageUrl ? resolveStorefrontImageUrl(imageUrl) : '';

  const selectMarketingTemplate = (kind: MarketingTemplateKind) => {
    const template = whatsAppTemplates.find((item) => item.kind === kind);
    if (!template) return;
    setSelectedTemplateKind(kind);
    const examples = applyWhatsAppTemplateExamples(template);
    setHeading(examples.heading);
    setStory(examples.story);
    setCampaignLink(examples.campaignLink);
    setPreviewName(examples.previewName);
    if (kind === 'marketing_text') {
      setImageUrl('');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === customers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(customers.map((c) => c.id)));
    }
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;
    setImageUploading(true);
    try {
      const result = await adminMarketingService.uploadImage(file);
      setImageUrl(result.imageUrl);
      setSelectedTemplateKind('marketing_image');
      toast.success('Image uploaded');
    } catch {
      toast.error('Image upload failed');
    } finally {
      setImageUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 rounded-xl border border-[#e2e8f0] bg-white p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => setTab('users')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
            tab === 'users' ? 'bg-[#0f172a] text-white' : 'text-[#64748b] hover:bg-[#f8fafc]'
          }`}
        >
          <Users className="h-4 w-4" />
          Users
        </button>
        <button
          type="button"
          onClick={() => setTab('marketing')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
            tab === 'marketing' ? 'bg-[#0f172a] text-white' : 'text-[#64748b] hover:bg-[#f8fafc]'
          }`}
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp Marketing
        </button>
        <button
          type="button"
          onClick={() => setTab('email-marketing')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
            tab === 'email-marketing'
              ? 'bg-[#0f172a] text-white'
              : 'text-[#64748b] hover:bg-[#f8fafc]'
          }`}
        >
          <Mail className="h-4 w-4" />
          Email Marketing
        </button>
      </div>

      {tab === 'users' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Users" value={stats.total} icon={Users} iconBg="bg-blue-50" iconColor="text-blue-600" />
            <StatCard label="With Orders" value={stats.withOrders} icon={RefreshCw} iconBg="bg-green-50" iconColor="text-green-600" />
            <StatCard label="VIP Signups" value={stats.vip} icon={MessageCircle} iconBg="bg-amber-50" iconColor="text-amber-600" />
            <StatCard label="Added Manually" value={stats.manual} icon={UserPlus} iconBg="bg-purple-50" iconColor="text-purple-600" />
          </div>

          <AdminTableCard>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] p-5">
              <DataTableToolbar
                searchPlaceholder="Search name, phone, email..."
                searchValue={search}
                onSearchChange={onSearchChange}
                dateRange={dateRange}
                onDateRangeChange={onDateRangeChange}
              >
                <FilterSelect
                  value={sourceFilter}
                  onChange={(value) => setSourceFilter(value as (typeof SOURCE_VALUES)[number])}
                  options={[
                    { value: 'ALL', label: 'All sources' },
                    { value: 'ORDER', label: 'From orders' },
                    { value: 'VIP', label: 'VIP signups' },
                    { value: 'MANUAL', label: 'Manual' },
                  ]}
                />
              </DataTableToolbar>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0f172a] px-4 text-sm font-semibold text-white hover:bg-[#1e293b]"
                >
                  <UserPlus className="h-4 w-4" />
                  Add User
                </button>
              </div>
            </div>

            <AdminTable>
              <AdminTableHead>
                <AdminTh>
                  <button type="button" onClick={toggleSelectAll} aria-label="Select all">
                    {selectedIds.size === customers.length && customers.length > 0 ? (
                      <CheckSquare className="h-4 w-4 text-[#0f172a]" />
                    ) : (
                      <Square className="h-4 w-4 text-[#94a3b8]" />
                    )}
                  </button>
                </AdminTh>
                <AdminTh>Name</AdminTh>
                <AdminTh>Phone</AdminTh>
                <AdminTh>Source</AdminTh>
                <AdminTh>Orders</AdminTh>
                <AdminTh>WhatsApp History</AdminTh>
                <AdminTh>Actions</AdminTh>
              </AdminTableHead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {isLoading ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-[#94a3b8]">Loading...</td></tr>
                ) : customers.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-[#94a3b8]">No users yet. Customers appear here from checkout, VIP signups, or when added manually.</td></tr>
                ) : (
                  customers.map((customer: StoreCustomer) => (
                    <tr key={customer.id} className="hover:bg-[#f8fafc]">
                      <AdminTd>
                        <button type="button" onClick={() => toggleSelect(customer.id)} aria-label={`Select ${customer.name}`}>
                          {selectedIds.has(customer.id) ? (
                            <CheckSquare className="h-4 w-4 text-[#0f172a]" />
                          ) : (
                            <Square className="h-4 w-4 text-[#94a3b8]" />
                          )}
                        </button>
                      </AdminTd>
                      <AdminTd className="font-medium text-[#0f172a]">{customer.name}</AdminTd>
                      <AdminTd className="font-mono text-sm">{customer.phone}</AdminTd>
                      <AdminTd>
                        <StatusBadge variant={customerSourceVariant(customer.source)}>
                          {customerSourceLabel(customer.source)}
                        </StatusBadge>
                      </AdminTd>
                      <AdminTd>{customer.orderCount ?? 0}</AdminTd>
                      <AdminTd>
                        {(customer.marketingMessageCount ?? 0) > 0 ? (
                          <div className="space-y-1">
                            <p className="text-xs text-[#64748b]">
                              {customer.marketingMessageCount} message{(customer.marketingMessageCount ?? 0) > 1 ? 's' : ''}
                            </p>
                            {customer.latestMarketingMessage && (
                              <div className="space-y-0.5">
                                <StatusBadge variant={marketingMessageVariant(customer.latestMarketingMessage.status)}>
                                  {customer.latestMarketingMessage.status === 'SENT' ? 'Sent' : customer.latestMarketingMessage.status === 'FAILED' ? 'Failed' : 'Skipped'}
                                </StatusBadge>
                                <p className="text-xs text-[#94a3b8]">{formatDate(customer.latestMarketingMessage.createdAt)}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#94a3b8]">No messages</span>
                        )}
                      </AdminTd>
                      <AdminTd>
                        <button
                          type="button"
                          onClick={() => setDetailId(customer.id)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-[#0f172a] hover:underline"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                      </AdminTd>
                    </tr>
                  ))
                )}
              </tbody>
            </AdminTable>
            {customersMeta && (
              <AdminPagination
                meta={customersMeta}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </AdminTableCard>

          {selectedIds.size > 0 && (
            <p className="text-sm text-[#64748b]">
              {selectedIds.size} user(s) selected — go to <button type="button" className="font-semibold text-[#0f172a] underline" onClick={() => setTab('marketing')}>WhatsApp Marketing</button> to send a message.
            </p>
          )}
        </>
      )}

      {tab === 'marketing' && (
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-6">
            <section className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-[#0f172a]">WhatsApp Templates</h2>
              <p className="mt-1 text-sm text-[#64748b]">
                Templates from{' '}
                <Link href="/admin/settings" className="font-medium text-[#0f172a] underline">
                  Settings → WhatsApp Templates
                </Link>
                . Pick one, then edit heading, story, and link.
              </p>
              {marketingWhatsAppTemplates.length === 0 ? (
                <p className="mt-4 text-sm text-amber-700">
                  No marketing templates found. Configure text and image marketing templates in Settings.
                </p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {MARKETING_TEMPLATE_KINDS.map((kind) => {
                    const template = whatsAppTemplates.find((item) => item.kind === kind);
                    if (!template) return null;
                    const selected = selectedTemplateKind === kind;
                    const available = template.status === 'APPROVED' && template.isActive;
                    return (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => selectMarketingTemplate(kind)}
                        className={`rounded-lg border p-3 text-left transition-colors ${
                          selected
                            ? 'border-[#0f172a] bg-[#f8fafc]'
                            : 'border-[#e2e8f0] hover:border-[#cbd5e1]'
                        }`}
                      >
                        <p className="text-sm font-semibold text-[#0f172a]">
                          {MARKETING_TEMPLATE_TITLES[kind]}
                        </p>
                        <p className="mt-1 text-xs text-[#64748b]">{template.name}</p>
                        <p
                          className={`mt-2 text-xs font-medium ${available ? 'text-green-700' : 'text-amber-700'}`}
                        >
                          {available
                            ? 'Approved and active'
                            : `${template.status} — approve and activate in Settings`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-base font-semibold text-[#0f172a]">Compose Message</h2>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#334155]">
                  Image {selectedTemplateKind === 'marketing_image' ? '(required)' : '(optional)'}
                </label>
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
                    onChange={(e) => void handleImageUpload(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                </label>
                {previewImageSrc ? (
                  <div className="relative mt-2 h-40 w-full max-w-sm overflow-hidden rounded-lg border border-[#e2e8f0] bg-[#f8fafc]">
                    <OptimizedImage
                      src={previewImageSrc}
                      alt="Marketing preview"
                      fill
                      sizes="384px"
                      unoptimized
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="absolute right-2 top-2 rounded-full bg-white/90 p-1 shadow"
                      aria-label="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#334155]">Clickable campaign link *</label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-[#94a3b8]" />
                  <input
                    type="url"
                    value={campaignLink}
                    onChange={(e) => setCampaignLink(e.target.value)}
                    className="h-10 w-full rounded-lg border border-[#e2e8f0] pl-9 pr-3 text-sm"
                    placeholder="https://your-store.com/collections/new"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#334155]">Heading</label>
                <input
                  value={heading}
                  onChange={(e) => setHeading(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm"
                  placeholder="e.g. ✨ New Collection at Singari Sarees"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#334155]">Story</label>
                <textarea
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm"
                  placeholder="Your message... Use {{name}} for customer name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#334155]">Preview name</label>
                <input
                  value={previewName}
                  onChange={(e) => setPreviewName(e.target.value)}
                  className="h-10 w-full max-w-xs rounded-lg border border-[#e2e8f0] px-3 text-sm"
                />
              </div>

              <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#64748b]">WhatsApp Preview</p>
                <pre className="whitespace-pre-wrap font-sans text-sm text-[#334155]">{previewMessage}</pre>
                {campaignLink ? (
                  <a href={campaignLink} target="_blank" rel="noreferrer" className="mt-3 block break-all text-sm font-medium text-blue-600 underline">
                    {campaignLink}
                  </a>
                ) : null}
              </div>

              <div className="space-y-3 border-t border-[#e2e8f0] pt-4">
                <label className="flex items-center gap-2 text-sm text-[#334155]">
                  <input type="checkbox" checked={sendToAll} onChange={(e) => setSendToAll(e.target.checked)} />
                  Send to all marketing-enabled users ({customersMeta?.total ?? customers.length})
                </label>
                {!sendToAll && (
                  <p className="text-sm text-[#64748b]">
                    {selectedIds.size > 0
                      ? `Will send to ${selectedIds.size} selected user(s)`
                      : 'Select users in the Users tab or enable send to all'}
                  </p>
                )}
                <button
                  type="button"
                  disabled={
                    sendMutation.isPending ||
                    !heading.trim() ||
                    !story.trim() ||
                    !/^https?:\/\/\S+$/i.test(campaignLink.trim()) ||
                    !metaTemplateAvailable ||
                    (selectedTemplateKind === 'marketing_image' && !imageUrl) ||
                    (!sendToAll && selectedIds.size === 0)
                  }
                  onClick={() => {
                    if (!window.confirm('Send WhatsApp marketing message to selected users?')) return;
                    sendMutation.mutate();
                  }}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#16a34a] text-sm font-semibold text-white hover:bg-[#15803d] disabled:opacity-40"
                >
                  {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send WhatsApp Campaign
                </button>
              </div>
            </section>
          </div>

          <section className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-[#0f172a]">Campaign History</h2>
            <div className="mt-4 space-y-3">
              {campaigns.length === 0 ? (
                <p className="text-sm text-[#94a3b8]">No campaigns sent yet.</p>
              ) : (
                campaigns.map((campaign) => (
                  <div key={campaign.id} className="rounded-lg border border-[#e2e8f0] p-4">
                    <p className="font-medium text-[#0f172a]">{campaign.heading}</p>
                    <p className="mt-1 text-xs text-[#64748b]">{formatDate(campaign.createdAt)}</p>
                    {campaign.campaignLink && (
                      <a href={campaign.campaignLink} target="_blank" rel="noreferrer" className="mt-1 block break-all text-xs text-blue-600 underline">{campaign.campaignLink}</a>
                    )}
                    <p className="mt-2 text-sm text-[#334155]">
                      Sent: <span className="font-semibold text-green-600">{campaign.sentCount}</span>
                      {' · '}Failed: <span className="font-semibold text-red-500">{campaign.failedCount}</span>
                      {' · '}Recipients: {campaign.recipientCount}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {tab === 'email-marketing' && (
        <EmailMarketingPanel
          selectedIds={selectedIds}
          customerCount={customersMeta?.total ?? customers.length}
        />
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#0f172a]">Add User</h2>
              <button type="button" onClick={() => setShowAddModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <input placeholder="Full name *" value={newUser.name} onChange={(e) => setNewUser((u) => ({ ...u, name: e.target.value }))} className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm" />
              <input placeholder="Mobile (10 digits) *" value={newUser.phone} onChange={(e) => setNewUser((u) => ({ ...u, phone: e.target.value }))} className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm" />
              <input placeholder="Email (optional)" value={newUser.email} onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))} className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm" />
              <textarea placeholder="Notes (optional)" value={newUser.notes} onChange={(e) => setNewUser((u) => ({ ...u, notes: e.target.value }))} rows={3} className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm" />
            </div>
            <button
              type="button"
              disabled={!newUser.name.trim() || !/^[6-9]\d{9}$/.test(newUser.phone.trim()) || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="mt-5 h-10 w-full rounded-lg bg-[#0f172a] text-sm font-semibold text-white disabled:opacity-40"
            >
              {createMutation.isPending ? 'Saving...' : 'Save User'}
            </button>
          </div>
        </div>
      )}

      {detailId && customerDetail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#0f172a]/40">
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-[#e2e8f0] bg-white p-5">
              <div>
                <h2 className="text-lg font-semibold text-[#0f172a]">{customerDetail.name}</h2>
                <p className="text-sm text-[#64748b]">{customerDetail.phone}</p>
              </div>
              <button type="button" onClick={() => setDetailId(null)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-6 p-5">
              <section>
                <h3 className="text-sm font-semibold text-[#0f172a]">WhatsApp Message History</h3>
                {(customerDetail.marketingMessages ?? []).length === 0 ? (
                  <p className="mt-2 text-sm text-[#94a3b8]">No marketing messages sent yet.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {customerDetail.marketingMessages!.map((message) => (
                      <div key={message.id} className="rounded-lg border border-[#e2e8f0] p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-[#0f172a]">{message.campaignHeading}</p>
                          <StatusBadge variant={marketingMessageVariant(message.status)}>
                            {message.status === 'SENT' ? 'Sent' : message.status === 'FAILED' ? 'Failed' : 'Skipped'}
                          </StatusBadge>
                        </div>
                        <p className="mt-1 text-xs text-[#64748b]">{formatDate(message.createdAt)}</p>
                        {message.errorMessage && (
                          <p className="mt-2 text-xs text-red-500">{message.errorMessage}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-sm font-semibold text-[#0f172a]">Orders ({customerDetail.orderCount ?? 0})</h3>
                {(customerDetail.orders ?? []).length === 0 ? (
                  <p className="mt-2 text-sm text-[#94a3b8]">No orders yet.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {customerDetail.orders!.map((order) => (
                      <div key={order.id} className="rounded-lg border border-[#e2e8f0] p-4">
                        <div className="flex items-center justify-between gap-2">
                          <Link href={`/admin/orders/${order.id}`} className="font-mono text-sm font-semibold text-[#0f172a] hover:underline">
                            {formatShortOrderNumber(order.orderNumber)}
                          </Link>
                          <StatusBadge variant={orderStatusVariant(order.status)}>
                            {getOrderStatusLabel(order.status)}
                          </StatusBadge>
                        </div>
                        <p className="mt-1 text-sm text-[#64748b]">{formatDate(order.createdAt)} · {formatPrice(order.grandTotal)}</p>
                        <ul className="mt-2 space-y-1 text-sm text-[#334155]">
                          {order.items.map((item, i) => (
                            <li key={i}>{item.productName} ({item.colorName}) ×{item.quantity}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
