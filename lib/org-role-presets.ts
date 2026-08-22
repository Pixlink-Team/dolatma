import type { ContributorPermissions } from "@/lib/contributor-permissions";
import type { OrgRole } from "@/lib/org-roles";
import type { MonitoringRole } from "@/lib/monitoring/types";

/** Default campaign + subtree management permissions for each org position. */
export function getOrgRolePermissionPreset(orgRole: OrgRole): ContributorPermissions {
  switch (orgRole) {
    case "primary":
      return {
        billboards: true,
        posters: true,
        videos: true,
        files: true,
        rawMedia: true,
        analytics: true,
        socialPosts: true,
        sitePublications: true,
        broadcast: true,
        meetings: true,
        activities: true,
        textContents: true,
        submissions: true,
        directives: true,
        smsReports: true,
        forms: false,
        mediaCommand: true,
        monitoring: true,
        campaignSettings: false,
        siteUpdates: false,
        sectionTutorials: false,
        nationalCalendar: true,
        defenseCalendar: true,
        bestPractices: true,
        manageSubtreeUsers: true,
        manageSubtreeDirectives: true,
        scoreSubtreeContent: true,
        manageSubtreeDevices: true,
        viewSubtreeLiveReport: true,
        viewSubtreePerformance: true,
      };
    case "deputy":
      return {
        billboards: true,
        posters: true,
        videos: true,
        files: true,
        rawMedia: true,
        analytics: true,
        socialPosts: true,
        sitePublications: true,
        broadcast: true,
        meetings: true,
        activities: true,
        textContents: true,
        submissions: true,
        directives: true,
        smsReports: true,
        forms: false,
        mediaCommand: true,
        monitoring: true,
        campaignSettings: false,
        siteUpdates: false,
        sectionTutorials: false,
        nationalCalendar: true,
        defenseCalendar: true,
        bestPractices: true,
        manageSubtreeUsers: true,
        manageSubtreeDirectives: true,
        scoreSubtreeContent: false,
        manageSubtreeDevices: true,
        viewSubtreeLiveReport: true,
        viewSubtreePerformance: true,
      };
    case "supervisor":
      return {
        billboards: true,
        posters: true,
        videos: true,
        files: true,
        rawMedia: true,
        analytics: true,
        socialPosts: true,
        sitePublications: true,
        broadcast: true,
        meetings: true,
        activities: true,
        textContents: true,
        submissions: true,
        directives: true,
        smsReports: true,
        forms: false,
        mediaCommand: false,
        monitoring: true,
        campaignSettings: false,
        siteUpdates: false,
        sectionTutorials: false,
        nationalCalendar: true,
        defenseCalendar: true,
        bestPractices: true,
        // Every org position may create users under their own subtree.
        manageSubtreeUsers: true,
        manageSubtreeDirectives: false,
        scoreSubtreeContent: false,
        manageSubtreeDevices: false,
        viewSubtreeLiveReport: false,
        viewSubtreePerformance: true,
      };
    case "pr":
      return {
        billboards: true,
        posters: true,
        videos: true,
        files: true,
        rawMedia: true,
        analytics: false,
        socialPosts: true,
        sitePublications: true,
        broadcast: true,
        meetings: false,
        activities: true,
        textContents: true,
        submissions: true,
        directives: true,
        smsReports: true,
        forms: false,
        mediaCommand: true,
        monitoring: true,
        campaignSettings: false,
        siteUpdates: false,
        sectionTutorials: false,
        nationalCalendar: true,
        defenseCalendar: true,
        bestPractices: true,
        manageSubtreeUsers: true,
        manageSubtreeDirectives: false,
        scoreSubtreeContent: false,
        manageSubtreeDevices: false,
        viewSubtreeLiveReport: false,
        viewSubtreePerformance: false,
      };
    default:
      return {
        billboards: true,
        posters: true,
        videos: true,
        files: true,
        rawMedia: true,
        analytics: false,
        socialPosts: true,
        sitePublications: true,
        broadcast: true,
        meetings: false,
        activities: true,
        textContents: true,
        submissions: true,
        directives: true,
        smsReports: true,
        forms: false,
        mediaCommand: true,
        monitoring: true,
        campaignSettings: false,
        siteUpdates: false,
        sectionTutorials: false,
        nationalCalendar: true,
        defenseCalendar: true,
        bestPractices: true,
        manageSubtreeUsers: true,
        manageSubtreeDirectives: false,
        scoreSubtreeContent: false,
        manageSubtreeDevices: false,
        viewSubtreeLiveReport: false,
        viewSubtreePerformance: false,
      };
  }
}

/** Monitoring capability role derived from org position. */
export function getMonitoringRoleForOrgRole(orgRole: OrgRole): MonitoringRole {
  switch (orgRole) {
    case "primary":
    case "deputy":
      return "organization_manager";
    case "supervisor":
      return "monitoring_manager";
    case "pr":
      return "public_relations_manager";
    default:
      return "public_relations_manager";
  }
}

/** Persian labels for subtree management toggles in the users form. */
export const subtreeManagementPermissionLabels = {
  manageSubtreeUsers: "مدیریت کاربران زیرشاخه",
  manageSubtreeDirectives: "صدور دستورکار برای زیرشاخه",
  scoreSubtreeContent: "امتیازدهی محتوای زیرشاخه",
  manageSubtreeDevices: "مدیریت دستگاه‌های زیرشاخه",
  viewSubtreeLiveReport: "گزارش زنده زیردستان",
  viewSubtreePerformance: "گزارش عملکرد زیردستان",
} as const;
