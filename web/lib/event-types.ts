export type EventCategory =
  | "petrecere"
  | "quiz"
  | "atelier"
  | "cultural"
  | "educational"
  | "sport"
  | "fundraising"
  | "recruitment"
  | "club"
  | "in_school"
  | "recrut"
  | "other";

export type EventStatus = "upcoming" | "ongoing" | "past" | "date-unknown";

export type EventImage = {
  src: string;
  alt: string;
  type: "photo" | "poster";
  width?: number;
  height?: number;
  position?: string;
};

export type EventRecord = {
  id: string;
  slug: string;

  title: string;
  subtitle?: string;
  shortDescription: string;
  fullDescription?: string;

  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  timezone: "Europe/Bucharest";

  venueName?: string;
  address?: string;
  mapsUrl?: string;

  category: EventCategory;

  charitableCause?: string;
  donationText?: string;
  ticketPrice?: string;
  registrationUrl?: string;
  internalTicketingUrl?: string;

  collaborators: string[];
  sponsors: string[];

  coverImage: EventImage;
  gallery: Array<EventImage & { sourcePostUrl?: string }>;

  instagramPostUrls: string[];
  instagramPostIds: string[];
  originalCaption?: string;
  publishedAt?: string;

  eventStatus: EventStatus;
  lifecycleEndedAt?: string;
  publishingStatus: "draft" | "published";

  extractionConfidence: "high" | "medium" | "low";
  missingFields: string[];
  lastSyncedAt: string;
};

export type EventOverride = Partial<Omit<EventRecord, "id" | "instagramPostUrls" | "instagramPostIds" | "lastSyncedAt">> & {
  hidden?: boolean;
  publish?: boolean;
  mergeInto?: string;
  splitSourceIds?: string[];
  imagePosition?: string;
};
