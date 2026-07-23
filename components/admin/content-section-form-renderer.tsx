"use client";

import { ImageIcon, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MediaUpload } from "@/components/ui/media-upload";
import { MediaThumbnail } from "@/components/ui/media-thumbnail";
import { DocumentUpload } from "@/components/ui/document-upload";
import { PersianDateInput } from "@/components/ui/persian-date-input";
import { PlanLabelSelect } from "@/components/admin/plan-label-select";
import { ContentScoreControl } from "@/components/admin/content-score-control";
import { BillboardLocationMapPicker } from "@/components/admin/billboard-location-map-picker";
import { ProvinceCityFields } from "@/components/admin/province-city-fields";
import {
  BillboardDisplayPeriodsEditor,
  type DisplayPeriodDraft,
} from "@/components/admin/billboard-display-periods-editor";
import {
  BILLBOARD_CATEGORIES,
  billboardCategoryLabels,
  type BillboardCategory,
} from "@/lib/billboard-categories";
import { CONTENT_TITLE_MAX_LENGTH } from "@/lib/content-constraints";
import type { ContentTopic } from "@/lib/content-topics";
import type { ContentFormField, ContentFormSectionKey } from "@/lib/types";
import type { EditSuggestionMissingField } from "@/lib/edit-suggestions";
import { cn } from "@/lib/utils";

export interface PosterSectionFormValues {
  imageUrl: string;
  title: string;
  description: string;
  planLabels: string[];
  notes: string;
  score?: number | null;
  metadata: Record<string, unknown>;
}

export interface BillboardSectionFormValues {
  category: BillboardCategory;
  province: string;
  city: string;
  axis: string;
  areaSqm: string;
  address: string;
  latitude: number;
  longitude: number;
  mapCenter: { lat: number; lng: number; revision?: number } | null;
  notes: string;
  planLabels: string[];
  periods: DisplayPeriodDraft[];
  score?: number | null;
  metadata: Record<string, unknown>;
}

interface SharedRendererProps {
  fields: ContentFormField[];
  contentTopics?: ContentTopic[];
  contentPlans?: string[];
  campaignId?: string;
  canScore?: boolean;
  isNew?: boolean;
  highlightFields?: EditSuggestionMissingField[];
  /** Preview in form builder: non-interactive. */
  readOnly?: boolean;
  className?: string;
  showAdminNotes?: boolean;
}

interface PosterRendererProps extends SharedRendererProps {
  sectionKey: "posters";
  values: PosterSectionFormValues;
  onChange: (patch: Partial<PosterSectionFormValues>) => void;
  contentId?: string;
  highlightTitle?: boolean;
  highlightDescription?: boolean;
  highlightMedia?: boolean;
}

interface BillboardRendererProps extends SharedRendererProps {
  sectionKey: "billboards";
  values: BillboardSectionFormValues;
  onChange: (patch: Partial<BillboardSectionFormValues>) => void;
  contentId?: string;
  highlightTitle?: boolean;
  highlightCity?: boolean;
  highlightLocation?: boolean;
  highlightDescription?: boolean;
  highlightMedia?: boolean;
  onLocationCenterChange?: (center: { lat: number; lng: number }) => void;
}

export type ContentSectionFormRendererProps =
  | PosterRendererProps
  | BillboardRendererProps;

function CustomFieldInput({
  field,
  value,
  onChange,
  readOnly,
}: {
  field: ContentFormField;
  value: unknown;
  onChange: (next: unknown) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {field.label.trim() || "بدون عنوان"}
        {field.required ? <span className="text-destructive mr-1">*</span> : null}
      </Label>

      {field.type === "text" && (
        <Input
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          readOnly={readOnly}
          tabIndex={readOnly ? -1 : undefined}
        />
      )}
      {field.type === "textarea" && (
        <Textarea
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          readOnly={readOnly}
          tabIndex={readOnly ? -1 : undefined}
        />
      )}
      {field.type === "number" && (
        <Input
          type="number"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          readOnly={readOnly}
          tabIndex={readOnly ? -1 : undefined}
        />
      )}
      {field.type === "select" && (
        <Select
          value={String(value ?? "") || undefined}
          onValueChange={(next) => onChange(next)}
          disabled={readOnly}
        >
          <SelectTrigger>
            <SelectValue placeholder="انتخاب کنید" />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {field.type === "checkbox" && (
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <span className="text-sm text-muted-foreground">بله / خیر</span>
          <Switch
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(checked)}
            disabled={readOnly}
          />
        </div>
      )}
      {field.type === "date" && (
        <PersianDateInput
          value={String(value ?? "") || undefined}
          onChange={(isoDate) => onChange(isoDate)}
          allowEmpty={!field.required}
        />
      )}
      {field.type === "file" && (
        <DocumentUpload
          value={String(value ?? "")}
          onChange={(payload) => onChange(payload.url)}
          label="آپلود فایل"
          disabled={readOnly}
        />
      )}
    </div>
  );
}

function setMetadataValue(
  metadata: Record<string, unknown>,
  key: string,
  value: unknown
): Record<string, unknown> {
  return { ...metadata, [key]: value };
}

export function ContentSectionFormRenderer(props: ContentSectionFormRendererProps) {
  const {
    fields,
    contentTopics = [],
    contentPlans = [],
    campaignId,
    canScore = false,
    isNew = true,
    readOnly = false,
    className,
    showAdminNotes = true,
  } = props;

  if (fields.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">هنوز فیلدی برای این فرم تعریف نشده است</p>
    );
  }

  return (
    <div
      className={cn("space-y-4", readOnly && "pointer-events-none select-none", className)}
      aria-disabled={readOnly || undefined}
    >
      {fields.map((field) => {
        if (field.kind === "custom") {
          const value = props.values.metadata[field.key];
          return (
            <CustomFieldInput
              key={field.id}
              field={field}
              value={value}
              readOnly={readOnly}
              onChange={(next) =>
                props.onChange({
                  metadata: setMetadataValue(props.values.metadata, field.key, next),
                })
              }
            />
          );
        }

        const widget = field.widget;
        if (!widget) return null;

        if (props.sectionKey === "posters") {
          const values = props.values;
          const onChange = props.onChange;

          switch (widget) {
            case "image":
              return (
                <MediaUpload
                  key={field.id}
                  label={field.label}
                  value={values.imageUrl}
                  onChange={(url) => onChange({ imageUrl: url })}
                  showPreview={false}
                  showLinkInput={false}
                  dropzoneContent={
                    <div
                      className={cn(
                        "relative h-72 w-full overflow-hidden rounded-[10px] bg-muted sm:h-80",
                        props.highlightMedia && "ring-2 ring-destructive ring-offset-2"
                      )}
                    >
                      {values.imageUrl ? (
                        <MediaThumbnail
                          src={values.imageUrl}
                          alt={values.title}
                          kind="poster"
                          sizes="100vw"
                          objectFit="contain"
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center text-sm text-muted-foreground">
                          <ImageIcon className="h-10 w-10" />
                          <span className="text-sm">تصویر را بکشید و رها کنید یا انتخاب کنید</span>
                          <span className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
                            <Upload className="h-3.5 w-3.5" />
                            انتخاب تصویر
                          </span>
                        </div>
                      )}
                    </div>
                  }
                />
              );
            case "title":
              return (
                <div key={field.id} className="space-y-2">
                  <Label className={cn(props.highlightTitle && "text-destructive")}>
                    {field.label}
                    {field.required ? <span className="text-destructive mr-1">*</span> : null}
                  </Label>
                  <Input
                    value={values.title}
                    maxLength={CONTENT_TITLE_MAX_LENGTH}
                    onChange={(e) => onChange({ title: e.target.value })}
                    placeholder={field.placeholder || "عنوان پوستر"}
                    className={cn(
                      props.highlightTitle && "border-destructive focus-visible:ring-destructive"
                    )}
                    readOnly={readOnly}
                  />
                </div>
              );
            case "description":
              return (
                <div key={field.id} className="space-y-2">
                  <Label
                    className={cn(
                      props.highlightDescription && "text-amber-700 dark:text-amber-300"
                    )}
                  >
                    {field.label}
                  </Label>
                  <Textarea
                    value={values.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                    rows={2}
                    placeholder={field.placeholder || "توضیحات (اختیاری)"}
                    className={cn(
                      props.highlightDescription &&
                        "border-amber-500 focus-visible:ring-amber-500"
                    )}
                    readOnly={readOnly}
                  />
                </div>
              );
            case "planLabels":
              return (
                <PlanLabelSelect
                  key={field.id}
                  topics={contentTopics}
                  plans={contentPlans}
                  values={values.planLabels}
                  onChangeMultiple={(planLabels) => onChange({ planLabels })}
                />
              );
            case "notes":
              return (
                <div key={field.id} className="space-y-2">
                  <Label>{field.label}</Label>
                  <Textarea
                    value={values.notes}
                    onChange={(e) => onChange({ notes: e.target.value })}
                    rows={2}
                    readOnly={readOnly}
                  />
                </div>
              );
            case "score":
              if (isNew || !campaignId || !props.contentId) return null;
              return (
                <ContentScoreControl
                  key={field.id}
                  campaignId={campaignId}
                  contentType="poster"
                  contentId={props.contentId}
                  score={values.score}
                  canScore={canScore}
                  onScoreSaved={(score) => onChange({ score })}
                />
              );
            default:
              return null;
          }
        }

        const values = props.values;
        const onChange = props.onChange;

        switch (widget) {
          case "category":
            return (
              <div key={field.id} className="space-y-2">
                <Label>
                  {field.label}
                  {field.required ? <span className="text-destructive mr-1">*</span> : null}
                </Label>
                <Select
                  value={values.category}
                  onValueChange={(value) =>
                    onChange({ category: value as BillboardCategory })
                  }
                  disabled={readOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب دسته" />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLBOARD_CATEGORIES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {billboardCategoryLabels[item]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          case "provinceCity":
            return (
              <div
                key={field.id}
                className={cn(
                  props.highlightCity &&
                    "rounded-lg border border-destructive bg-destructive/5 p-3"
                )}
              >
                <ProvinceCityFields
                  province={values.province}
                  city={values.city}
                  onProvinceChange={(province) => onChange({ province })}
                  onCityChange={(city) => onChange({ city })}
                  onLocationCenterChange={props.onLocationCenterChange}
                />
              </div>
            );
          case "axis":
            return (
              <div key={field.id} className="space-y-2">
                <Label className={cn(props.highlightTitle && "text-destructive")}>
                  {field.label}
                  {field.required ? <span className="text-destructive mr-1">*</span> : null}
                </Label>
                <Input
                  value={values.axis}
                  onChange={(e) => onChange({ axis: e.target.value })}
                  className={cn(
                    props.highlightTitle && "border-destructive focus-visible:ring-destructive"
                  )}
                  readOnly={readOnly}
                />
              </div>
            );
          case "areaSqm":
            return (
              <div key={field.id} className="space-y-2">
                <Label>{field.label}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={values.areaSqm}
                  onChange={(e) => onChange({ areaSqm: e.target.value })}
                  readOnly={readOnly}
                />
              </div>
            );
          case "address":
            return (
              <div key={field.id} className="space-y-2">
                <Label
                  className={cn(
                    props.highlightLocation && "text-destructive",
                    !props.highlightLocation &&
                      props.highlightDescription &&
                      "text-amber-700 dark:text-amber-300"
                  )}
                >
                  {field.label}
                </Label>
                <Input
                  value={values.address}
                  onChange={(e) => onChange({ address: e.target.value })}
                  className={cn(
                    props.highlightLocation &&
                      "border-destructive focus-visible:ring-destructive",
                    !props.highlightLocation &&
                      props.highlightDescription &&
                      "border-amber-500 focus-visible:ring-amber-500"
                  )}
                  readOnly={readOnly}
                />
              </div>
            );
          case "map":
            return (
              <div key={field.id} className="space-y-2">
                <Label>
                  {field.label}
                  {field.required ? <span className="text-destructive mr-1">*</span> : null}
                </Label>
                <BillboardLocationMapPicker
                  latitude={values.latitude}
                  longitude={values.longitude}
                  mapCenter={values.mapCenter}
                  onChange={(coords) =>
                    onChange({
                      latitude: coords.latitude,
                      longitude: coords.longitude,
                    })
                  }
                />
              </div>
            );
          case "notes":
            if (!showAdminNotes) return null;
            return (
              <div key={field.id} className="space-y-2">
                <Label>{field.label}</Label>
                <Textarea
                  value={values.notes}
                  onChange={(e) => onChange({ notes: e.target.value })}
                  rows={2}
                  readOnly={readOnly}
                />
              </div>
            );
          case "planLabels":
            return (
              <PlanLabelSelect
                key={field.id}
                topics={contentTopics}
                plans={contentPlans}
                values={values.planLabels}
                onChangeMultiple={(planLabels) => onChange({ planLabels })}
              />
            );
          case "score":
            if (isNew || !campaignId || !props.contentId) return null;
            return (
              <ContentScoreControl
                key={field.id}
                campaignId={campaignId}
                contentType="billboard"
                contentId={props.contentId}
                score={values.score}
                canScore={canScore}
                onScoreSaved={(score) => onChange({ score })}
              />
            );
          case "periods":
            return (
              <BillboardDisplayPeriodsEditor
                key={field.id}
                periods={values.periods}
                onChange={(periods) => onChange({ periods })}
                requireBillboardImage={field.required}
                highlightMedia={props.highlightMedia}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

export function emptyPosterFormValues(): PosterSectionFormValues {
  return {
    imageUrl: "",
    title: "",
    description: "",
    planLabels: [],
    notes: "",
    score: null,
    metadata: {},
  };
}

export function emptyBillboardFormValues(): BillboardSectionFormValues {
  return {
    category: "billboard",
    province: "",
    city: "",
    axis: "",
    areaSqm: "",
    address: "",
    latitude: 35.6892,
    longitude: 51.389,
    mapCenter: { lat: 35.6892, lng: 51.389 },
    notes: "",
    planLabels: [],
    periods: [],
    score: null,
    metadata: {},
  };
}

export type { ContentFormSectionKey };
