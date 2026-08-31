"use client";

import { useStore } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Star, TrendingUp } from "lucide-react";
import { Input, Textarea } from "@/components/ui/Input";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";

export default function ReviewsPage() {
  const userId = useStore((s) => s.currentUserId) || "";
  const myJobs = useStore((s) => s.jobs.filter((j) => j.contractorId === userId));
  const myApps = useStore((s) => s.applications.filter((a) => myJobs.some((j) => j.id === a.jobId) && a.status === "completed"));
  const users = useStore((s) => s.users);
  const reviews = useStore((s) => s.reviews);
  const reviewWorker = useStore((s) => s.reviewWorker);

  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState({ rating: 5, reliability: 5, skill: 5, safety: 5, comment: "" });

  const target = myApps.find((a) => a.id === open);
  const myReviews = reviews.filter((r) => r.reviewerId === userId);

  const ratingDist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: myReviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-navy-900">Reviews</h2>
        <p className="text-sm text-gray-700 mt-1">Rate your workers and see your reputation</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card>
          <CardHeader><CardTitle>Average rating</CardTitle></CardHeader>
          <CardBody className="text-center">
            <div className="text-5xl font-bold text-navy-900">4.7</div>
            <div className="flex items-center justify-center gap-0.5 mt-2 text-amber-600">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <div className="text-xs text-gray-600 mt-2">From {myReviews.length} reviews</div>
            <Badge variant="green" className="mt-3" iconLeft={<TrendingUp className="h-3 w-3" />}>+0.2 this month</Badge>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Rating distribution</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            {ratingDist.map((d) => (
              <div key={d.star} className="flex items-center gap-3">
                <div className="flex items-center gap-0.5 w-16 text-amber-600">
                  {Array.from({ length: d.star }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-600" style={{ width: `${myReviews.length ? (d.count / myReviews.length) * 100 : 0}%` }} />
                </div>
                <div className="text-xs text-gray-600 w-8 text-right">{d.count}</div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Review workers</CardTitle>
          <CardSubtitle>Completed jobs awaiting your review</CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-2">
          {myApps.length === 0 ? (
            <p className="text-sm text-gray-600 text-center py-4">No completed jobs pending review.</p>
          ) : (
            myApps.map((a) => {
              const worker = users.find((u) => u.id === a.workerId);
              return (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <Avatar name={worker?.name ?? "?"} size={36} />
                    <div>
                      <div className="text-sm font-semibold text-navy-900">{worker?.name}</div>
                      <div className="text-xs text-gray-600">{formatDate(a.appliedAt)}</div>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setOpen(a.id)}>Review worker</Button>
                </div>
              );
            })
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent reviews</CardTitle></CardHeader>
        <CardBody className="space-y-3">
          {myReviews.slice(0, 5).map((r) => {
            const worker = users.find((u) => u.id === r.revieweeId);
            return (
              <div key={r.id} className="p-3 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-navy-900">{worker?.name}</div>
                  <div className="flex items-center gap-0.5 text-amber-600">
                    {Array.from({ length: r.rating }).map((_, k) => (
                      <Star key={k} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-700 mt-1">{r.comment}</p>
                <div className="text-xs text-gray-500 mt-1">{formatDate(r.createdAt)}</div>
              </div>
            );
          })}
        </CardBody>
      </Card>

      <Modal open={!!open} onClose={() => setOpen(null)} title="Review worker">
        {target && (
          <div className="space-y-3">
            <div className="text-sm text-navy-900">
              Reviewing: <span className="font-semibold">{users.find((u) => u.id === target.workerId)?.name}</span>
            </div>
            {[
              { key: "rating", label: "Overall rating" },
              { key: "reliability", label: "Reliability" },
              { key: "skill", label: "Skill" },
              { key: "safety", label: "Safety" },
            ].map((dim) => (
              <div key={dim.key}>
                <div className="text-sm font-medium text-navy-900 mb-1.5">{dim.label}</div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setForm({ ...form, [dim.key]: s })}
                      className={`h-8 w-8 rounded-md flex items-center justify-center ${
                        (form as any)[dim.key] >= s ? "text-amber-600" : "text-gray-300"
                      }`}
                    >
                      <Star className="h-5 w-5 fill-current" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <Textarea label="Comment" rows={3} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setOpen(null)}>Cancel</Button>
              <Button
                onClick={() => {
                  reviewWorker({
                    reviewerId: userId,
                    revieweeId: target.workerId,
                    jobId: target.jobId,
                    rating: form.rating,
                    comment: form.comment,
                    reliability: form.reliability,
                    skill: form.skill,
                    safety: form.safety,
                  });
                  setOpen(null);
                  setForm({ rating: 5, reliability: 5, skill: 5, safety: 5, comment: "" });
                }}
              >
                Submit review
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
