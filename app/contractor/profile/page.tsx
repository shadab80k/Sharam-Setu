"use client";

import { useStore } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Edit2, MapPin, Star, Briefcase, ShieldCheck, Camera, Loader2, Building2 } from "lucide-react";
import { useState, useRef } from "react";
import { CITIES, getCity } from "@/lib/utils/cities";

const BUSINESS_TYPES = ["Residential", "Commercial", "Infrastructure", "Renovation"];

export default function ContractorProfilePage() {
  const currentUserId = useStore((s) => s.currentUserId) || "usr_c_1";
  const user = useStore((s) => s.users.find((u) => u.id === currentUserId));
  const profile = useStore((s) => s.contractorProfiles.find((p) => p.userId === currentUserId));
  const myJobs = useStore((s) => s.jobs.filter((j) => j.contractorId === currentUserId));
  const activeJobs = myJobs.filter((j) => j.status === "active").length;
  const reviews = useStore((s) => s.reviews.filter((r) => r.revieweeId === currentUserId));
  const update = useStore((s) => s.updateContractorProfile);
  const uploadAvatar = useStore((s) => s.uploadAvatar);
  const pushToast = useStore((s) => s.pushToast);

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({
    name: user?.name ?? "",
    companyName: profile?.companyName ?? "",
    businessType: profile?.businessType ?? BUSINESS_TYPES[0],
    location: user?.location ?? "lucknow",
  });

  if (!user || !profile) return null;

  const city = getCity(user.location || profile.location || "lucknow");

  function openEdit() {
    if (!user || !profile) return;
    setForm({
      name: user.name,
      companyName: profile.companyName,
      businessType: profile.businessType || BUSINESS_TYPES[0],
      location: user.location || profile.location || "lucknow",
    });
    setEditOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await update(currentUserId, {
        name: form.name.trim(),
        companyName: form.companyName.trim(),
        businessType: form.businessType,
        location: form.location,
      });
      setEditOpen(false);
    } catch {
      // store already surfaces the API error as a toast; keep the modal open so input isn't lost
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      pushToast("error", "Only JPG, PNG or WebP photos are allowed");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      pushToast("error", "Photo must be smaller than 2 MB");
      return;
    }
    setAvatarBusy(true);
    try {
      await uploadAvatar(file);
    } catch (err: any) {
      pushToast("error", err.message ?? "Upload failed");
    } finally {
      setAvatarBusy(false);
    }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <Card>
        <CardBody className="p-6">
          <div className="flex items-start gap-5 flex-wrap">
            <div className="relative">
              <Avatar src={user.avatar} name={user.name} size={88} className="ring-4 ring-white shadow-elevated" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarBusy}
                title="Change company logo / photo"
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-md hover:bg-orange-700 transition disabled:opacity-60"
              >
                {avatarBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarPick}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold text-navy-900">{profile.companyName}</h2>
                <Badge variant="blue" iconLeft={<Building2 className="h-3 w-3" />}>{profile.businessType || "Contractor"}</Badge>
              </div>
              <p className="text-sm text-gray-700 mt-1">{user.name}</p>
              <div className="flex items-center gap-3 mt-2 text-sm text-gray-600 flex-wrap">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {city.name}</span>
                <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-600" /> {profile.rating.toFixed(1)} rating · {reviews.length} reviews</span>
                <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {myJobs.length} jobs posted ({activeJobs} active)</span>
              </div>
            </div>
            <div className="text-right space-y-3">
              <div>
                <div className="text-xs text-gray-600">Trust score</div>
                <div className="text-2xl font-bold text-navy-900 flex items-center gap-1.5 justify-end">
                  {profile.trustScore}
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-xs text-green-700 font-medium">{profile.trustLabel}</div>
              </div>
              <Button variant="secondary" size="sm" onClick={openEdit} iconLeft={<Edit2 className="h-3.5 w-3.5" />}>
                Edit profile
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Company details</CardTitle>
            <CardSubtitle>Workers see this information when you post jobs</CardSubtitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-lg bg-cream-100">
              <span className="text-sm text-gray-600">Company name</span>
              <span className="text-sm font-semibold text-navy-900">{profile.companyName}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-cream-100">
              <span className="text-sm text-gray-600">Business type</span>
              <span className="text-sm font-semibold text-navy-900">{profile.businessType || "—"}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-cream-100">
              <span className="text-sm text-gray-600">City</span>
              <span className="text-sm font-semibold text-navy-900">{city.name}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-cream-100">
              <span className="text-sm text-gray-600">Contact person</span>
              <span className="text-sm font-semibold text-navy-900">{user.name}</span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reputation</CardTitle>
            <CardSubtitle>How workers rate you</CardSubtitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-lg bg-cream-100">
              <span className="text-sm text-gray-600">Trust label</span>
              <Badge variant="green">{profile.trustLabel}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-cream-100">
              <span className="text-sm text-gray-600">Average rating</span>
              <span className="text-sm font-semibold text-navy-900 flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> {profile.rating.toFixed(1)} / 5
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-cream-100">
              <span className="text-sm text-gray-600">Payment reliability</span>
              <span className="text-sm font-semibold text-navy-900">
                {profile.paidPayments > 0
                  ? `${profile.paymentReliability}% on time (of ${profile.paidPayments} paid)`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-cream-100">
              <span className="text-sm text-gray-600">Jobs completed</span>
              <span className="text-sm font-semibold text-navy-900">{profile.completedJobs}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-cream-100">
              <span className="text-sm text-gray-600">Reviews received</span>
              <span className="text-sm font-semibold text-navy-900">{reviews.length}</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Edit Profile Modal — every field the contractor API supports */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit company profile">
        <div className="space-y-3">
          <Input
            label="Company name"
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            placeholder="e.g. Sharma Constructions"
          />
          <Input
            label="Your name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Contact person"
          />
          <Select
            label="Business type"
            value={form.businessType}
            onChange={(e) => setForm({ ...form, businessType: e.target.value })}
            options={BUSINESS_TYPES.map((b) => ({ value: b, label: b }))}
          />
          <Select
            label="City"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            options={CITIES.map((c) => ({ value: c.id, label: c.name }))}
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving || form.name.trim().length < 2 || form.companyName.trim().length < 2}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
