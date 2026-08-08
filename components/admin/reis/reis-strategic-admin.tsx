"use client";

import { useState } from "react";
import { DirectivesAdmin } from "@/components/admin/directives-admin";
import { ReisUpwardRequestsPanel } from "@/components/admin/reis/reis-upward-requests-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { StrategicUpwardRequest } from "@/lib/strategic-requests";
import type {
  CampaignDirective,
  CampaignSubmission,
  Ministry,
} from "@/lib/types";
import { formatPersianNumber } from "@/lib/utils";

type CampaignUserOption = {
  id: string;
  name: string;
  email: string;
  role: string;
  region: import("@/lib/user-regions").UserRegion | null;
  phone: string | null;
  province?: string | null;
  city?: string | null;
  ministryId?: string | null;
  ministryName?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
};

type ReisStrategicAdminProps = {
  campaignId: string;
  currentUserId: string | null;
  initialDirectives: CampaignDirective[];
  archivedDirectives: CampaignDirective[];
  inboxDirectives: CampaignDirective[];
  rejectedSubmissions: CampaignSubmission[];
  campaignUsers: CampaignUserOption[];
  ministries: Ministry[];
  upwardRequests: StrategicUpwardRequest[];
  canCreateUpwardRequest: boolean;
};

export function ReisStrategicAdmin({
  campaignId,
  currentUserId,
  initialDirectives,
  archivedDirectives,
  inboxDirectives,
  rejectedSubmissions,
  campaignUsers,
  ministries,
  upwardRequests,
  canCreateUpwardRequest,
}: ReisStrategicAdminProps) {
  const [tab, setTab] = useState<"directives" | "requests">("directives");
  const pendingRequests = upwardRequests.filter(
    (row) => row.status === "pending" || row.status === "reviewing"
  ).length;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">ارتباطات راهبردی</h1>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
          رییس در بالاترین سطح می‌تواند به همه نهادها دستورکار بدهد، دستورکارهای
          خود و زیرمجموعه‌ها را ببیند، پیگیری کند چه کسانی دیده‌اند، و درخواست‌های
          بالاسری را بررسی کند.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
        <TabsList>
          <TabsTrigger value="directives">دستورکار و پیگیری</TabsTrigger>
          <TabsTrigger value="requests">
            درخواست‌های بالاسری ({formatPersianNumber(pendingRequests)})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directives" className="mt-4">
          <DirectivesAdmin
            campaignId={campaignId}
            canManage
            audienceScope="global"
            isFullAdmin={false}
            issuerFilterEnabled
            currentUserId={currentUserId}
            headingTitle="دستورکارها"
            headingDescription="دستورکارهای صادرشده توسط شما، دستورکارهای زیرمجموعه‌ها، و پیگیری مشاهده مخاطبان"
            initialDirectives={initialDirectives}
            archivedDirectives={archivedDirectives}
            inboxDirectives={inboxDirectives}
            rejectedSubmissions={rejectedSubmissions}
            campaignUsers={campaignUsers}
            ministries={ministries}
          />
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          <ReisUpwardRequestsPanel
            campaignId={campaignId}
            initialRequests={upwardRequests}
            canRespond
            canCreate={canCreateUpwardRequest}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
