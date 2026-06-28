import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { PublicCampaignData } from "@/lib/types";
import { formatPersianDate } from "@/lib/utils";

export function generateCampaignPdf(data: PublicCampaignData): Buffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const { settings, kpis } = data;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(settings.title, 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Campaign Report - ${settings.slug}`, 14, 28);
  doc.text(
    `${formatPersianDate(settings.startDate)} to ${formatPersianDate(settings.endDate)}`,
    14,
    34
  );

  autoTable(doc, {
    startY: 42,
    head: [["Metric", "Value"]],
    body: [
      ["Billboards", String(kpis.totalBillboards)],
      ["Posters", String(kpis.totalPosters)],
      ["Videos", String(kpis.totalVideos)],
      ["Site Visitors", String(kpis.totalSiteVisitors)],
      ["Social Followers", String(kpis.totalSocialFollowers)],
      ["Participants", String(kpis.totalParticipants)],
      ["Social Posts", String(data.socialPosts.length)],
      ["Broadcast Reports", String(data.broadcastReports.length)],
    ],
  });

  let currentY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 42;

  if (data.billboards.length > 0) {
    currentY += 10;
    doc.setFontSize(12);
    doc.text("Billboards", 14, currentY);
    autoTable(doc, {
      startY: currentY + 4,
      head: [["Title", "City", "Date", "Owner"]],
      body: data.billboards.map((item) => [
        item.title,
        item.city,
        formatPersianDate(item.date),
        item.ownerName ?? "Admin",
      ]),
    });
    currentY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY;
  }

  if (data.socialPosts.length > 0) {
    currentY += 10;
    doc.text("Social Media Posts", 14, currentY);
    autoTable(doc, {
      startY: currentY + 4,
      head: [["Platform", "Title", "Views", "Type", "Owner"]],
      body: data.socialPosts.map((item) => [
        item.platform,
        item.title,
        String(item.views),
        item.contentType,
        item.ownerName ?? "Admin",
      ]),
    });
    currentY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY;
  }

  if (data.broadcastReports.length > 0) {
    currentY += 10;
    doc.text("Broadcast Reports (IRIB)", 14, currentY);
    autoTable(doc, {
      startY: currentY + 4,
      head: [["Title", "Date", "Billboards", "Cities", "Owner"]],
      body: data.broadcastReports.map((item) => [
        item.title,
        formatPersianDate(item.reportDate),
        String(item.summaryData.totalBillboards ?? "-"),
        String(item.summaryData.totalCities ?? "-"),
        item.ownerName ?? "Admin",
      ]),
    });
  }

  return Buffer.from(doc.output("arraybuffer"));
}
