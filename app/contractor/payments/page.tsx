"use client";

import { useStore } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { MetricCard } from "@/components/ui/MetricCard";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Wallet, AlertCircle, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { formatINR, formatINRShort, formatDate } from "@/lib/utils";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

export default function ContractorPaymentsPage() {
  const userId = useStore((s) => s.currentUserId) || "";
  const payments = useStore((s) => s.payments.filter((p) => p.contractorId === userId));
  const jobs = useStore((s) => s.jobs);
  const workers = useStore((s) => s.users);
  const markPaid = useStore((s) => s.markPaymentPaid);

  const [confirm, setConfirm] = useState<string | null>(null);
  const pending = payments.filter((p) => p.status === "pending" || p.status === "due");
  const overdue = payments.filter((p) => p.status === "overdue");
  const paid = payments.filter((p) => p.status === "paid");

  const totalPaid = paid.reduce((s, p) => s + p.amount, 0);
  const totalPending = pending.reduce((s, p) => s + p.amount, 0);
  const totalOverdue = overdue.reduce((s, p) => s + p.amount, 0);
  const dueThisWeek = pending.filter((p) => new Date(p.dueDate).getTime() - Date.now() < 7 * 86400000).length;

  const target = payments.find((p) => p.id === confirm);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-navy-900">Payments</h2>
        <p className="text-sm text-gray-700 mt-1">Track and disburse payments to your workers</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Paid" value={formatINRShort(totalPaid)} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" hint="All time" />
        <MetricCard label="Pending" value={formatINRShort(totalPending)} icon={<Clock className="h-5 w-5" />} tone="amber" hint={`${pending.length} payments`} />
        <MetricCard label="Due this week" value={dueThisWeek.toString()} icon={<TrendingUp className="h-5 w-5" />} tone="blue" hint="Upcoming" />
        <MetricCard label="Overdue" value={formatINRShort(totalOverdue)} icon={<AlertCircle className="h-5 w-5" />} tone="red" hint={`${overdue.length} need attention`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All payments</CardTitle>
          <CardSubtitle>{payments.length} records</CardSubtitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-cream-50 text-left text-xs uppercase tracking-wider text-gray-600">
                  <th className="px-4 py-3 font-semibold">Worker</th>
                  <th className="px-4 py-3 font-semibold">Job</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  <th className="px-4 py-3 font-semibold">Due</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const job = jobs.find((j) => j.id === p.jobId);
                  const worker = workers.find((u) => u.id === p.workerId);
                  return (
                    <tr key={p.id} className="border-b border-gray-200 hover:bg-cream-50">
                      <td className="px-4 py-3 font-medium text-navy-900">{worker?.name}</td>
                      <td className="px-4 py-3 text-gray-700">{job?.title}</td>
                      <td className="px-4 py-3 text-right font-semibold text-navy-900">{formatINR(p.amount)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(p.dueDate)}</td>
                      <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3 text-right">
                        {p.status !== "paid" && (
                          <Button variant="success" size="sm" onClick={() => setConfirm(p.id)}>
                            Mark as paid
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Confirm payment">
        {target && (
          <div className="space-y-3">
            <p className="text-sm text-navy-900">
              Mark <span className="font-bold">{formatINR(target.amount)}</span> as paid to{" "}
              <span className="font-bold">{workers.find((u) => u.id === target.workerId)?.name}</span>?
            </p>
            <div className="p-3 rounded-lg bg-blue-100 text-xs text-blue-600">
              The worker will receive an in-app notification and their income dashboard will update.
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>
              <Button variant="success" onClick={() => { markPaid(target.id); setConfirm(null); }}>Confirm</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
