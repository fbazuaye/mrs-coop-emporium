import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { STATUS_LABELS, type CreditRepayment, type CreditRequest } from "@/lib/credit";

function nairaPlain(n: number): string {
  return "NGN " + new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(n || 0);
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

const REQUEST_HEADERS = [
  "Date",
  "Member",
  "Employee ID",
  "Amount",
  "Approved",
  "Tenure (mo)",
  "Monthly",
  "Status",
  "Outstanding",
  "Purpose",
  "Reviewer notes",
];

const REPAYMENT_HEADERS = ["Paid on", "Member", "Employee ID", "Amount", "Notes"];

export function exportCreditRequestsCsv(requests: CreditRequest[]) {
  const rows: (string | number)[][] = [REQUEST_HEADERS];
  for (const r of requests) {
    rows.push([
      new Date(r.created_at).toISOString().slice(0, 10),
      r.member_name,
      r.employee_id,
      Number(r.amount),
      r.approved_amount ?? "",
      r.tenure_months,
      Number(r.monthly_repayment),
      STATUS_LABELS[r.status],
      Number(r.outstanding_balance),
      r.purpose ?? "",
      r.reviewer_notes ?? "",
    ]);
  }
  download(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }), `credit-requests-${stamp()}.csv`);
}

export function exportRepaymentsCsv(
  repayments: CreditRepayment[],
  requests: CreditRequest[],
) {
  const byId = new Map(requests.map((r) => [r.id, r]));
  const rows: (string | number)[][] = [REPAYMENT_HEADERS];
  for (const p of repayments) {
    const r = byId.get(p.credit_request_id);
    rows.push([
      p.paid_on,
      r?.member_name ?? "—",
      r?.employee_id ?? "—",
      Number(p.amount),
      p.notes ?? "",
    ]);
  }
  download(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }), `credit-repayments-${stamp()}.csv`);
}

function buildHeader(doc: jsPDF, title: string, subtitle: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(122, 14, 20);
  doc.text("MRS Staff Coop", 40, 40);
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text(title, 40, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(subtitle, 40, 76);
  doc.text(`Generated ${new Date().toLocaleString()}`, 40, 90);
}

export function exportCreditRequestsPdf(requests: CreditRequest[]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const outstanding = requests.reduce((s, r) => s + Number(r.outstanding_balance || 0), 0);
  const approved = requests
    .filter((r) => ["approved", "repaying", "completed"].includes(r.status))
    .reduce((s, r) => s + Number(r.approved_amount || r.amount), 0);

  buildHeader(
    doc,
    "Credit requests",
    `${requests.length} requests · Approved ${nairaPlain(approved)} · Outstanding ${nairaPlain(outstanding)}`,
  );

  autoTable(doc, {
    startY: 110,
    head: [REQUEST_HEADERS],
    body: requests.map((r) => [
      new Date(r.created_at).toLocaleDateString(),
      r.member_name,
      r.employee_id,
      nairaPlain(Number(r.amount)),
      r.approved_amount != null ? nairaPlain(Number(r.approved_amount)) : "—",
      String(r.tenure_months),
      nairaPlain(Number(r.monthly_repayment)),
      STATUS_LABELS[r.status],
      nairaPlain(Number(r.outstanding_balance)),
      r.purpose ?? "",
      r.reviewer_notes ?? "",
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [122, 14, 20], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 246, 246] },
    columnStyles: {
      9: { cellWidth: 110 },
      10: { cellWidth: 110 },
    },
  });

  doc.save(`credit-requests-${stamp()}.pdf`);
}

export function exportRepaymentsPdf(
  repayments: CreditRepayment[],
  requests: CreditRequest[],
) {
  const byId = new Map(requests.map((r) => [r.id, r]));
  const collected = repayments.reduce((s, p) => s + Number(p.amount || 0), 0);

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  buildHeader(
    doc,
    "Repayment history",
    `${repayments.length} repayments · Total collected ${nairaPlain(collected)}`,
  );

  autoTable(doc, {
    startY: 110,
    head: [REPAYMENT_HEADERS],
    body: repayments.map((p) => {
      const r = byId.get(p.credit_request_id);
      return [
        new Date(p.paid_on).toLocaleDateString(),
        r?.member_name ?? "—",
        r?.employee_id ?? "—",
        nairaPlain(Number(p.amount)),
        p.notes ?? "",
      ];
    }),
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [122, 14, 20], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 246, 246] },
  });

  doc.save(`credit-repayments-${stamp()}.pdf`);
}
