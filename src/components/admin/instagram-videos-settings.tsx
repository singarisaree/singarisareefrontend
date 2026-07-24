'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { isAxiosError } from 'axios';
import { adminInstagramReelService } from '@/services/admin.service';
import { refreshStorefrontAfterInstagramChange } from '@/lib/refresh-storefront';
import { resolveStorefrontImageUrl } from '@/lib/image';
import { StatusBadge } from '@/components/admin/status-badge';
import type { InstagramReel } from '@/types';

const MAX_REELS = 10;
const MAX_UPLOAD_MB = 40;

export function InstagramVideosSettings() {
  const queryClient = useQueryClient();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [instagramUrl, setInstagramUrl] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: reels = [], isLoading } = useQuery({
    queryKey: ['admin-instagram-reels'],
    queryFn: () => adminInstagramReelService.getAll(),
  });

  const sortedReels = useMemo(
    () =>
      [...reels].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt),
      ),
    [reels],
  );

  const resetForm = () => {
    setVideoFile(null);
    setInstagramUrl('');
    setSortOrder(String(sortedReels.length));
    setIsActive(true);
    setEditingId(null);
  };

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-instagram-reels'] });
    void refreshStorefrontAfterInstagramChange();
  };

  const buildFormData = (requireVideo: boolean) => {
    if (requireVideo && !videoFile) {
      throw new Error('Video file is required');
    }
    if (!instagramUrl.trim()) {
      throw new Error('Instagram link is required');
    }
    if (videoFile && videoFile.size > MAX_UPLOAD_MB * 1024 * 1024) {
      throw new Error(`Video must be under ${MAX_UPLOAD_MB} MB`);
    }

    const formData = new FormData();
    if (videoFile) formData.append('video', videoFile);
    formData.append('instagramUrl', instagramUrl.trim());
    formData.append('sortOrder', String(Number(sortOrder) || 0));
    formData.append('isActive', String(isActive));
    return formData;
  };

  const createReel = useMutation({
    mutationFn: () => adminInstagramReelService.create(buildFormData(true)),
    onSuccess: () => {
      toast.success(
        sortedReels.length >= MAX_REELS
          ? 'Video added (oldest video was removed to keep max 10)'
          : 'Instagram video added',
      );
      resetForm();
      invalidate();
    },
    onError: (error) => {
      if (error instanceof Error && !isAxiosError(error)) {
        toast.error(error.message);
        return;
      }
      const data = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)
        : undefined;
      toast.error(data?.message || 'Failed to add Instagram video');
    },
  });

  const updateReel = useMutation({
    mutationFn: () => {
      if (!editingId) throw new Error('No video selected');
      return adminInstagramReelService.update(editingId, buildFormData(false));
    },
    onSuccess: () => {
      toast.success('Instagram video updated');
      resetForm();
      invalidate();
    },
    onError: (error) => {
      if (error instanceof Error && !isAxiosError(error)) {
        toast.error(error.message);
        return;
      }
      const data = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)
        : undefined;
      toast.error(data?.message || 'Failed to update Instagram video');
    },
  });

  const deleteReel = useMutation({
    mutationFn: (id: string) => adminInstagramReelService.delete(id),
    onSuccess: () => {
      toast.success('Instagram video deleted');
      if (editingId) resetForm();
      invalidate();
    },
    onError: () => toast.error('Failed to delete Instagram video'),
  });

  const reorder = useMutation({
    mutationFn: (orderedIds: string[]) => adminInstagramReelService.reorder(orderedIds),
    onSuccess: () => {
      toast.success('Order updated');
      invalidate();
    },
    onError: () => toast.error('Failed to update order'),
  });

  const moveReel = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= sortedReels.length) return;
    const ids = sortedReels.map((reel) => reel.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(next, 0, moved);
    reorder.mutate(ids);
  };

  const startEdit = (reel: InstagramReel) => {
    setEditingId(reel.id);
    setVideoFile(null);
    setInstagramUrl(reel.instagramUrl);
    setSortOrder(String(reel.sortOrder));
    setIsActive(reel.isActive);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (editingId) updateReel.mutate();
    else createReel.mutate();
  };

  return (
    <section className="space-y-5 rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-[#0f172a]">Instagram videos</h2>
        <p className="mt-1 text-sm text-[#64748b]">
          Upload up to {MAX_REELS} videos for the homepage. Videos are converted to MP4 and
          compressed. Add the Instagram link so taps open that reel in the Instagram app. If you
          add an 11th, the oldest is removed.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
        <div>
          <label className="text-xs font-medium text-[#64748b]">
            Video file {editingId ? '(optional — leave blank to keep current)' : '*'}
          </label>
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
            onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
            className="mt-1.5 block w-full text-sm text-[#0f172a] file:mr-3 file:rounded-lg file:border-0 file:bg-[#0f172a] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
          />
          <p className="mt-1 text-xs text-[#94a3b8]">
            MP4 / WebM / MOV up to {MAX_UPLOAD_MB} MB. Server converts to compressed MP4 (~720p).
          </p>
          {videoFile ? (
            <p className="mt-1 text-xs text-[#64748b]">
              Selected: {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)
            </p>
          ) : null}
        </div>

        <div>
          <label className="text-xs font-medium text-[#64748b]">Instagram link *</label>
          <input
            type="url"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="https://www.instagram.com/reel/..."
            className="mt-1.5 h-10 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm text-[#0f172a] outline-none focus:border-[#0f172a]"
          />
          <p className="mt-1 text-xs text-[#94a3b8]">
            Clicking the homepage video opens this Instagram reel.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-[#64748b]">Sort order</label>
            <input
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#0f172a]"
            />
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm text-[#334155]">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-[#cbd5e1]"
            />
            Visible on homepage
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={createReel.isPending || updateReel.isPending}
            className="rounded-lg bg-[#0f172a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1e293b] disabled:opacity-60"
          >
            {editingId
              ? updateReel.isPending
                ? 'Updating…'
                : 'Update video'
              : createReel.isPending
                ? 'Uploading & converting…'
                : 'Add video'}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm font-medium text-[#475569] hover:bg-[#f8fafc]"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="space-y-3">
        <p className="text-sm font-medium text-[#0f172a]">
          Videos ({sortedReels.length}/{MAX_REELS})
        </p>
        {isLoading ? (
          <p className="text-sm text-[#94a3b8]">Loading…</p>
        ) : sortedReels.length === 0 ? (
          <p className="text-sm text-[#94a3b8]">No Instagram videos yet.</p>
        ) : (
          <ul className="space-y-2">
            {sortedReels.map((reel, index) => (
              <li
                key={reel.id}
                className="flex flex-col gap-3 rounded-lg border border-[#e2e8f0] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-1 gap-3">
                  <video
                    src={resolveStorefrontImageUrl(reel.videoUrl)}
                    className="h-20 w-14 shrink-0 rounded-md object-cover bg-[#f1f5f9]"
                    muted
                    playsInline
                    preload="metadata"
                  />
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <StatusBadge variant={reel.isActive ? 'active' : 'inactive'}>
                        {reel.isActive ? 'Live' : 'Hidden'}
                      </StatusBadge>
                      <span className="text-xs text-[#94a3b8]">Order {reel.sortOrder}</span>
                    </div>
                    <a
                      href={reel.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-sm text-[#0f172a] underline-offset-2 hover:underline"
                    >
                      {reel.instagramUrl}
                    </a>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => moveReel(index, -1)}
                    disabled={index === 0 || reorder.isPending}
                    className="rounded-lg border border-[#e2e8f0] p-2 text-[#475569] hover:bg-[#f8fafc] disabled:opacity-40"
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveReel(index, 1)}
                    disabled={index === sortedReels.length - 1 || reorder.isPending}
                    className="rounded-lg border border-[#e2e8f0] p-2 text-[#475569] hover:bg-[#f8fafc] disabled:opacity-40"
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(reel)}
                    className="rounded-lg border border-[#e2e8f0] p-2 text-[#475569] hover:bg-[#f8fafc]"
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm('Delete this Instagram video?')) return;
                      deleteReel.mutate(reel.id);
                    }}
                    className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
