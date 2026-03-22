"use client";

import { useState, useRef } from "react";
import {
  X,
  Save,
  Loader2,
  Plus,
  Star,
  Smile,
  Camera,
} from "lucide-react";
import toast from "react-hot-toast";
import { useLocale } from "@/lib/i18n";
import { RatingInput } from "./RatingInput";
import {
  type Person,
  type PersonFormData,
  RELATIONSHIP_OPTIONS,
  HIERARCHY_OPTIONS,
} from "./types";

export function PersonForm({
  initial,
  onSave,
  onCancel,
  saving,
  allPeople = [],
  allProjectLabels = [],
  currentId,
  currentPhoto,
}: {
  initial: PersonFormData;
  allProjectLabels?: string[];
  onSave: (data: PersonFormData) => void;
  onCancel: () => void;
  saving: boolean;
  allPeople?: Person[];
  currentId?: string;
  currentPhoto?: string;
}) {
  const { t } = useLocale();
  const [form, setForm] = useState<PersonFormData>(initial);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    currentPhoto ? `/api/people/photos/${encodeURIComponent(currentPhoto)}` : null
  );
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (file: File) => {
    if (!currentId) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = typeof window !== "undefined" ? localStorage.getItem("pm_token") : null;
      const res = await fetch(`/api/people/${currentId}/photo`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setPhotoPreview(`/api/people/photos/${encodeURIComponent(data.photo)}?t=${Date.now()}`);
      toast.success("Photo uploaded");
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 space-y-4">
      {/* Photo upload area - only when editing */}
      {currentId && (
        <div className="mb-2">
          <div
            className={`relative w-20 h-20 rounded-lg border-2 border-dashed border-neutral-300 dark:border-neutral-600 flex items-center justify-center cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors overflow-hidden bg-neutral-100 dark:bg-neutral-800 ${uploadingPhoto ? "opacity-60 pointer-events-none" : ""}`}
            onClick={() => photoInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const file = e.dataTransfer.files?.[0]; if (file) handlePhotoUpload(file); }}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center text-neutral-400 dark:text-neutral-500">
                <Camera className="w-5 h-5 mx-auto mb-0.5 opacity-40" />
                <p className="text-[8px]">사진</p>
              </div>
            )}
            {uploadingPhoto && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              </div>
            )}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) handlePhotoUpload(file); }}
            />
          </div>
          {photoPreview && (
            <button
              type="button"
              onClick={async () => {
                try {
                  const token = typeof window !== "undefined" ? localStorage.getItem("pm_token") : null;
                  await fetch(`/api/people/${currentId}/photo`, {
                    method: "DELETE",
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                  });
                  setPhotoPreview(null);
                  toast.success("Photo removed");
                } catch { toast.error("Failed"); }
              }}
              className="mt-1 text-xs text-red-400 hover:text-red-600 transition-colors"
            >
              사진 제거
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            {t("people.name")} *
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder={t("people.fullName")}
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            별칭
          </label>
          <input
            name="alias"
            value={form.alias}
            onChange={handleChange}
            placeholder="별칭 (선택)"
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            {t("people.role")}
          </label>
          <input
            name="role"
            value={form.role}
            onChange={handleChange}
            placeholder="e.g. Professor, Researcher, Student"
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            {t("people.affiliation")}
          </label>
          <input
            name="affiliation"
            value={form.affiliation}
            onChange={handleChange}
            placeholder="University or Organization"
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            산업
          </label>
          <input
            name="industry"
            value={form.industry}
            onChange={handleChange}
            placeholder="e.g. Education, IT, Healthcare"
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            {t("people.email")}
          </label>
          {(() => {
            const emails = form.email ? form.email.split(",").map((e) => e.trim()) : [""];
            const updateEmails = (newEmails: string[]) => setForm({ ...form, email: newEmails.join(", ") });
            return (
              <div className="space-y-1.5">
                {emails.map((em, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <input
                      value={em}
                      onChange={(e) => { const arr = [...emails]; arr[idx] = e.target.value; updateEmails(arr); }}
                      placeholder="email@example.com"
                      className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {emails.length > 1 && (
                      <button type="button" onClick={() => { const arr = emails.filter((_, i) => i !== idx); updateEmails(arr.length ? arr : [""]); }} className="p-1 text-neutral-400 hover:text-red-500 rounded"><X className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => updateEmails([...emails, ""])} className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300">
                  <Plus className="w-3 h-3" /> Add email
                </button>
              </div>
            );
          })()}
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            {t("people.relationship")}
          </label>
          <select
            name="relationship"
            value={form.relationship}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {RELATIONSHIP_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            위계
          </label>
          <select
            name="hierarchy"
            value={form.hierarchy}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">--</option>
            {HIERARCHY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Importance + Closeness */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            중요도
          </label>
          <RatingInput
            value={parseInt(form.importance) || 0}
            onChange={(v) => setForm({ ...form, importance: String(v) })}
            icon={Star}
            activeColor="text-amber-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            친밀도
          </label>
          <RatingInput
            value={parseInt(form.closeness) || 0}
            onChange={(v) => setForm({ ...form, closeness: String(v) })}
            icon={Smile}
            activeColor="text-pink-400"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
          {t("people.expertiseHint")}
        </label>
        <input
          name="expertise"
          value={form.expertise}
          onChange={handleChange}
          placeholder="e.g. HRD, AI, Bibliometrics"
          className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
          {t("people.notes")}
        </label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={2}
          placeholder="Free text notes"
          className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>
      {/* Projects */}
      {allProjectLabels.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            연관 프로젝트
          </label>
          <div className="flex flex-wrap gap-1.5 p-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg min-h-[36px]">
            {allProjectLabels.map((proj) => {
              const isSelected = form.projects.includes(proj);
              return (
                <button
                  key={proj}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      projects: isSelected
                        ? f.projects.filter((p) => p !== proj)
                        : [...f.projects, proj],
                    }))
                  }
                  className={`px-2 py-0.5 rounded-full text-xs transition-colors ${
                    isSelected
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                      : "bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-300 dark:hover:bg-neutral-600"
                  }`}
                >
                  {proj}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {/* Connections */}
      {allPeople.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            {t("people.connectedPeople")}
          </label>
          <div className="flex flex-wrap gap-1.5 p-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg min-h-[36px]">
            {[...allPeople]
              .filter((p) => p.id !== currentId)
              .sort((a, b) => {
                if (a.relationship === "self" && b.relationship !== "self") return -1;
                if (b.relationship === "self" && a.relationship !== "self") return 1;
                return (b.importance || 0) - (a.importance || 0);
              })
              .map((p) => {
                const isSelected = form.connections.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        connections: isSelected
                          ? f.connections.filter((id) => id !== p.id)
                          : [...f.connections, p.id],
                      }))
                    }
                    className={`px-2 py-0.5 rounded-full text-xs transition-colors ${
                      isSelected
                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                        : "bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-300 dark:hover:bg-neutral-600"
                    }`}
                  >
                    {p.name}{p.alias ? ` (${p.alias})` : ""}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          {t("action.cancel")}
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.name.trim()}
          className="px-4 py-2 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {t("action.save")}
        </button>
      </div>
    </div>
  );
}
