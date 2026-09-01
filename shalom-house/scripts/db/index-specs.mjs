export const RUNTIME_INDEX_SPECS = {
  admin_users: [
    { name: "admin_users_normalized_email_unique", keys: { normalizedEmail: 1 }, options: { unique: true } },
    { name: "admin_users_management_list", keys: { status: 1, role: 1, displayName: 1, _id: 1 }, options: {} },
  ],
  admin_sessions: [
    { name: "admin_sessions_token_hash_unique", keys: { tokenHash: 1 }, options: { unique: true } },
    { name: "admin_sessions_expires_ttl", keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
    { name: "admin_sessions_user_active", keys: { userId: 1, revokedAt: 1, expiresAt: -1 }, options: {} },
  ],
  admin_login_attempts: [
    { name: "admin_login_attempts_key_hash_unique", keys: { keyHash: 1 }, options: { unique: true } },
    { name: "admin_login_attempts_expires_ttl", keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
  ],
  admin_user_audit_events: [
    { name: "admin_user_audit_events_version_unique", keys: { adminUserId: 1, toVersionAt: 1 }, options: { unique: true } },
    { name: "admin_user_audit_events_timeline", keys: { adminUserId: 1, occurredAt: -1, _id: -1 }, options: {} },
  ],
  donors: [
    { name: "donors_reference_unique", keys: { reference: 1 }, options: { unique: true } },
    { name: "donors_admin_list", keys: { status: 1, type: 1, displayName: 1, _id: 1 }, options: {} },
  ],
  donations: [
    { name: "donations_reference_unique", keys: { reference: 1 }, options: { unique: true } },
    { name: "donations_admin_list", keys: { status: 1, donatedOn: -1, createdAt: -1, _id: -1 }, options: {} },
    { name: "donations_confirmed_month", keys: { status: 1, donatedOn: 1 }, options: {} },
    { name: "donations_donor_history", keys: { donorId: 1, donatedOn: -1, _id: -1 }, options: {} },
  ],
  donor_audit_events: [
    { name: "donor_audit_events_version_unique", keys: { donorId: 1, toVersionAt: 1 }, options: { unique: true } },
    { name: "donor_audit_events_timeline", keys: { donorId: 1, occurredAt: -1, _id: -1 }, options: {} },
  ],
  donation_audit_events: [
    { name: "donation_audit_events_version_unique", keys: { donationId: 1, toVersionAt: 1 }, options: { unique: true } },
    { name: "donation_audit_events_timeline", keys: { donationId: 1, occurredAt: -1, _id: -1 }, options: {} },
  ],
  facility_spaces: [
    { name: "facility_spaces_public_order", keys: { publicationStatus: 1, displayOrder: 1, publishedAt: 1, _id: 1 }, options: {} },
    { name: "facility_spaces_admin_order", keys: { publicationStatus: 1, displayOrder: 1, updatedAt: -1, _id: -1 }, options: {} },
  ],
  facility_space_audit_events: [
    { name: "facility_space_audit_events_version_unique", keys: { facilitySpaceId: 1, toVersionAt: 1 }, options: { unique: true } },
    { name: "facility_space_audit_events_timeline", keys: { facilitySpaceId: 1, occurredAt: -1, _id: -1 }, options: {} },
  ],
  gallery_items: [
    { name: "gallery_items_slug_unique", keys: { slug: 1 }, options: { unique: true } },
    { name: "gallery_items_media_sha256_unique", keys: { "media.sha256": 1 }, options: { unique: true } },
    { name: "gallery_items_admin_status", keys: { publicationStatus: 1, approvalStatus: 1, consentStatus: 1, updatedAt: -1, _id: -1 }, options: {} },
    { name: "gallery_items_public_visibility", keys: { publicationStatus: 1, approvalStatus: 1, consentStatus: 1, consentWithdrawnAt: 1, displayStartOn: 1, displayEndOn: 1, activityDate: -1, publishedAt: -1, _id: -1 }, options: {} },
    { name: "gallery_items_admin_updated", keys: { deletedAt: 1, updatedAt: -1, _id: -1 }, options: {} },
    { name: "gallery_items_deleted_timeline", keys: { deletedAt: -1, _id: -1 }, options: {} },
  ],
  gallery_audit_events: [
    { name: "gallery_audit_events_item_version_unique", keys: { galleryItemId: 1, toVersionAt: 1 }, options: { unique: true } },
    { name: "gallery_audit_events_item_timeline", keys: { galleryItemId: 1, occurredAt: -1, _id: -1 }, options: {} },
    { name: "gallery_audit_events_recent", keys: { occurredAt: -1, _id: -1 }, options: {} },
  ],
  inquiries: [
    { name: "inquiries_reference_unique", keys: { reference: 1 }, options: { unique: true } },
    { name: "inquiries_admin_list", keys: { status: 1, kind: 1, createdAt: -1, _id: -1 }, options: {} },
    { name: "inquiries_retention_ttl", keys: { deleteAfter: 1 }, options: { expireAfterSeconds: 0 } },
  ],
  inquiry_audit_events: [
    { name: "inquiry_audit_events_version_unique", keys: { inquiryId: 1, toVersionAt: 1 }, options: { unique: true } },
    { name: "inquiry_audit_events_timeline", keys: { inquiryId: 1, occurredAt: -1, _id: -1 }, options: {} },
    { name: "inquiry_audit_events_retention_ttl", keys: { deleteAfter: 1 }, options: { expireAfterSeconds: 0 } },
  ],
  inquiry_submission_limits: [
    { name: "inquiry_submission_limits_window_unique", keys: { keyHash: 1, windowStartedAt: 1 }, options: { unique: true } },
    { name: "inquiry_submission_limits_ttl", keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
  ],
  news_posts: [
    { name: "news_posts_slug_unique", keys: { slug: 1 }, options: { unique: true } },
    { name: "news_posts_public_list", keys: { publicationStatus: 1, approvalStatus: 1, publishedAt: -1 }, options: {} },
    { name: "news_posts_deleted_timeline", keys: { deletedAt: -1, _id: -1 }, options: {} },
    { name: "news_posts_admin_updated", keys: { deletedAt: 1, updatedAt: -1, _id: -1 }, options: {} },
  ],
  news_audit_events: [
    { name: "news_audit_events_post_version_unique", keys: { newsPostId: 1, toVersionAt: 1 }, options: { unique: true } },
    { name: "news_audit_events_post_timeline", keys: { newsPostId: 1, occurredAt: -1, _id: -1 }, options: {} },
    { name: "news_audit_events_recent", keys: { occurredAt: -1, _id: -1 }, options: {} },
    { name: "news_audit_events_actor_timeline", keys: { "actor.adminId": 1, occurredAt: -1, _id: -1 }, options: {} },
  ],
  program_posts: [
    { name: "program_posts_slug_unique", keys: { slug: 1 }, options: { unique: true } },
    { name: "program_posts_public_list", keys: { publicationStatus: 1, approvalStatus: 1, sortOrder: 1, publishedAt: -1, _id: -1 }, options: {} },
    { name: "program_posts_admin_updated", keys: { deletedAt: 1, updatedAt: -1, _id: -1 }, options: {} },
    { name: "program_posts_deleted_timeline", keys: { deletedAt: -1, _id: -1 }, options: {} },
  ],
  program_audit_events: [
    { name: "program_audit_events_program_version_unique", keys: { programId: 1, toVersionAt: 1 }, options: { unique: true } },
    { name: "program_audit_events_program_timeline", keys: { programId: 1, occurredAt: -1, _id: -1 }, options: {} },
    { name: "program_audit_events_recent", keys: { occurredAt: -1, _id: -1 }, options: {} },
    { name: "program_audit_events_actor_timeline", keys: { "actor.adminId": 1, occurredAt: -1, _id: -1 }, options: {} },
  ],
  site_content_documents: [
    { name: "site_content_documents_key_unique", keys: { key: 1 }, options: { unique: true } },
  ],
  site_content_audit_events: [
    { name: "site_content_audit_events_key_timeline", keys: { siteContentKey: 1, occurredAt: -1, _id: -1 }, options: {} },
  ],
  staff_profiles: [
    { name: "staff_profiles_public_order", keys: { publicationStatus: 1, displayOrder: 1, publishedAt: 1, _id: 1 }, options: {} },
    { name: "staff_profiles_admin_order", keys: { publicationStatus: 1, displayOrder: 1, updatedAt: -1, _id: -1 }, options: {} },
  ],
  staff_audit_events: [
    { name: "staff_audit_events_profile_version_unique", keys: { staffProfileId: 1, toVersionAt: 1 }, options: { unique: true } },
    { name: "staff_audit_events_profile_timeline", keys: { staffProfileId: 1, occurredAt: -1, _id: -1 }, options: {} },
  ],
  transparency_documents: [
    { name: "transparency_documents_deleted_timeline", keys: { deletedAt: -1, _id: -1 }, options: {} },
    { name: "transparency_documents_slug_unique", keys: { slug: 1 }, options: { unique: true, partialFilterExpression: { deletedAt: null } } },
    { name: "transparency_documents_file_sha256_unique", keys: { "file.sha256": 1 }, options: { unique: true, partialFilterExpression: { deletedAt: null } } },
    { name: "transparency_documents_updated", keys: { updatedAt: -1, _id: -1 }, options: {} },
    { name: "transparency_documents_category_updated", keys: { category: 1, updatedAt: -1 }, options: {} },
    { name: "transparency_documents_publication_updated", keys: { publicationStatus: 1, updatedAt: -1 }, options: {} },
    { name: "transparency_documents_privacy_updated", keys: { privacyReviewStatus: 1, updatedAt: -1 }, options: {} },
    { name: "transparency_documents_final_updated", keys: { finalDocumentStatus: 1, updatedAt: -1 }, options: {} },
    { name: "transparency_documents_public_visibility", keys: { publicationStatus: 1, approvalStatus: 1, privacyReviewStatus: 1, finalDocumentStatus: 1, publishedAt: -1, documentDate: -1, _id: -1 }, options: {} },
  ],
  transparency_audit_events: [
    { name: "transparency_audit_events_content_occurred", keys: { transparencyDocumentId: 1, occurredAt: -1, _id: -1 }, options: {} },
  ],
};

export const INDEX_COLLECTION_GROUPS = {
  adminAuth: ["admin_users", "admin_sessions", "admin_login_attempts", "admin_user_audit_events"],
  donation: ["donors", "donations", "donor_audit_events", "donation_audit_events"],
  facilitySpace: ["facility_spaces", "facility_space_audit_events"],
  gallery: ["gallery_items", "gallery_audit_events"],
  inquiry: ["inquiries", "inquiry_audit_events", "inquiry_submission_limits"],
  news: ["news_posts", "news_audit_events"],
  program: ["program_posts", "program_audit_events"],
  siteContent: ["site_content_documents", "site_content_audit_events"],
  staff: ["staff_profiles", "staff_audit_events"],
  transparency: ["transparency_documents", "transparency_audit_events"],
};

export function toCreateIndexSpecs(collectionName) {
  return RUNTIME_INDEX_SPECS[collectionName].map(({ name, keys, options }) => ({ key: keys, name, ...options }));
}
