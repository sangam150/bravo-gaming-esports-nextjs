import type { SponsorClickDestination } from "./types";

export type SponsorDestinationInput = {
  websiteUrl?: string | null;
  campaignUrl?: string | null;
  socialUrl?: string | null;
  url?: string | null;
  homepageClickDestination?: SponsorClickDestination | null;
  openInNewTab?: boolean | null;
};

export type SponsorDestinationField = "websiteUrl" | "campaignUrl" | "socialUrl";

export class SponsorLinkValidationError extends Error {
  readonly field: SponsorDestinationField;

  constructor(field: SponsorDestinationField) {
    super(`${field} must be a complete HTTPS URL without embedded credentials.`);
    this.name = "SponsorLinkValidationError";
    this.field = field;
  }
}

function hasUnsafeUrlCharacters(value: string) {
  return /[\u0000-\u001f\u007f]/.test(value);
}

export function normalizeSponsorExternalUrl(value?: string | null) {
  const normalizedValue = value?.trim();
  if (!normalizedValue || hasUnsafeUrlCharacters(normalizedValue)) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(normalizedValue);
    if (parsedUrl.protocol !== "https:" || !parsedUrl.hostname || parsedUrl.username || parsedUrl.password) {
      return undefined;
    }

    return parsedUrl.toString();
  } catch {
    return undefined;
  }
}

function validateOptionalDestination(field: SponsorDestinationField, value?: string | null) {
  const normalizedValue = value?.trim();
  if (!normalizedValue) {
    return undefined;
  }

  const validatedValue = normalizeSponsorExternalUrl(normalizedValue);
  if (!validatedValue) {
    throw new SponsorLinkValidationError(field);
  }

  return validatedValue;
}

export function validateSponsorDestinations(input: SponsorDestinationInput) {
  return {
    websiteUrl: validateOptionalDestination("websiteUrl", input.websiteUrl ?? input.url),
    campaignUrl: validateOptionalDestination("campaignUrl", input.campaignUrl),
    socialUrl: validateOptionalDestination("socialUrl", input.socialUrl),
  };
}

export function normalizeSponsorClickDestination(value?: string | null): SponsorClickDestination {
  if (value === "website" || value === "campaign" || value === "social" || value === "none") {
    return value;
  }

  return "auto";
}

export function resolveSponsorDestination(input: SponsorDestinationInput) {
  const destinations = {
    website: normalizeSponsorExternalUrl(input.websiteUrl ?? input.url),
    campaign: normalizeSponsorExternalUrl(input.campaignUrl),
    social: normalizeSponsorExternalUrl(input.socialUrl),
  };
  const selectedDestination = normalizeSponsorClickDestination(input.homepageClickDestination);

  if (selectedDestination === "none") {
    return undefined;
  }

  if (selectedDestination !== "auto") {
    return destinations[selectedDestination];
  }

  return destinations.website ?? destinations.campaign ?? destinations.social;
}

export function sponsorOpensInNewTab(input: SponsorDestinationInput) {
  return Boolean(resolveSponsorDestination(input)) && input.openInNewTab !== false;
}

const SPONSOR_SLUG_ALIASES = new Map<string, string>([["hukut-store", "hukut"]]);

export function resolveCanonicalSponsorSlug(slug: string) {
  const normalizedSlug = slug.trim().toLowerCase();
  return SPONSOR_SLUG_ALIASES.get(normalizedSlug) ?? normalizedSlug;
}

export function isSponsorSlugAlias(slug: string) {
  const normalizedSlug = slug.trim().toLowerCase();
  return SPONSOR_SLUG_ALIASES.has(normalizedSlug);
}
