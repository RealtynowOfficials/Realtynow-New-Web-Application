-- v_properties_search is a fixed column-list view (not SELECT *), so the
-- new area_unit/price_per_unit columns from 0118 are invisible to every
-- search/listing/detail surface until added here explicitly.
CREATE OR REPLACE VIEW public.v_properties_search AS
 SELECT p.id,
    p.owner_id,
    p.title,
    p.description,
    p.property_type_id,
    p.purpose,
    p.city_id,
    p.locality_id,
    p.address,
    p.latitude,
    p.longitude,
    p.price,
    p.rent_amount,
    p.security_deposit,
    p.bedrooms,
    p.bathrooms,
    p.balconies,
    p.floor_number,
    p.total_floors,
    p.built_up_area,
    p.carpet_area,
    p.plot_area,
    p.facing,
    p.furnishing,
    p.parking,
    p.age_of_property,
    p.ownership_type,
    p.legal_approved,
    p.amenities,
    p.features,
    p.images,
    p.videos,
    p.floor_plans,
    p.documents,
    p.builder_id,
    p.project_id,
    p.status,
    p.is_featured,
    p.is_luxury,
    p.view_count,
    p.ai_description,
    p.ai_seo,
    p.ai_tags,
    p.assigned_agent_id,
    p.rejection_reason,
    p.published_at,
    p.created_at,
    p.updated_at,
    p.listing_category,
    p.property_sub_type,
    p.pg_details,
    p.nearby_places,
    p.seo_metadata,
    p.availability_details,
    p.ownership_details,
    p.media_urls,
    p.approval_status,
    p.is_live,
    p.approved_by,
    p.approved_at,
    p.reviewed_by,
    p.reviewed_at,
    p.has_virtual_tour,
    p.virtual_tour_cover,
    p.virtual_tour_count,
    p.super_area,
    p.building_area,
    p.wall_area,
    p.usable_area,
    p.indoor_parking,
    p.outdoor_parking,
    p.road_width,
    p.corner_plot,
    p.water_supply,
    p.power_backup,
    p.lift,
    p.security_type,
    p.nearby_locations,
    p.listing_validity,
    p.expires_at,
    p.renewal_count,
    p.last_renewed_at,
    p.verified_by,
    p.verified_at,
    p.verification_notes,
    p.seo_title,
    p.seo_description,
    p.seo_keywords,
    p.property_code,
    p.source,
    p.language,
    p.current_step,
    p.completed_steps,
    p.draft_data,
    p.completion_percentage,
    p.is_draft,
    p.last_saved_at,
    p.possession_status,
    p.verified_status,
    p.ai_score,
    p.state,
    p.country,
    p.place_id,
    p.verification_status,
    p.ai_verified_at,
    p.pincode,
    p.seo_slug,
    p.og_title,
    p.og_description,
    p.og_image,
    p.twitter_title,
    p.twitter_description,
    p.twitter_image,
    p.canonical_url,
    p.json_ld,
    p.image_alt_text,
    p.seo_generated_at,
    p.location_name,
    p.area,
    p.locality,
    p.city,
    p.district,
    p.formatted_address,
    p.submission_id,
    p.cover_image_url,
    p.change_request_reason,
    p.change_requested_at,
    p.plot_details,
    p.is_active,
    p.deleted_at,
    c.name AS city_name,
    l.name AS locality_name,
    pt.name AS property_type_name,
    pt.category AS property_type_category,
    b.name AS builder_name,
    pr.name AS project_name,
    ((((((((((((((((((((((((((((((((((((((((((((((COALESCE(p.title, ''::text) || ' '::text) || COALESCE(p.description, ''::text)) || ' '::text) || COALESCE(p.address, ''::text)) || ' '::text) || COALESCE(p.pincode, ''::text)) || ' '::text) || COALESCE(c.name, ''::text)) || ' '::text) || COALESCE(l.name, ''::text)) || ' '::text) || COALESCE(pt.name, ''::text)) || ' '::text) || COALESCE(pt.category, ''::text)) || ' '::text) || COALESCE(b.name, ''::text)) || ' '::text) || COALESCE(pr.name, ''::text)) || ' '::text) || COALESCE(prof_agent.first_name, ''::text)) || ' '::text) || COALESCE(prof_agent.last_name, ''::text)) || ' '::text) || COALESCE(prof_owner.first_name, ''::text)) || ' '::text) || COALESCE(prof_owner.last_name, ''::text)) || ' '::text) || COALESCE(p.state, ''::text)) || ' '::text) || COALESCE(p.country, ''::text)) || ' '::text) || COALESCE(p.facing, ''::text)) || ' '::text) || COALESCE(p.furnishing, ''::text)) || ' '::text) || COALESCE(p.possession_status, ''::text)) || ' '::text) || COALESCE(p.verified_status, ''::text)) || ' '::text) || COALESCE(p.verification_status, ''::text)) || ' '::text) ||
        CASE
            WHEN p.bedrooms IS NOT NULL THEN ((((((p.bedrooms::text || ' BHK '::text) || p.bedrooms::text) || 'BHK '::text) || p.bedrooms::text) || ' bedroom '::text) || p.bedrooms::text) || ' bed '::text
            ELSE ''::text
        END) ||
        CASE
            WHEN p.bathrooms IS NOT NULL THEN ((p.bathrooms::text || ' Bath '::text) || p.bathrooms::text) || ' Bathroom '::text
            ELSE ''::text
        END) ||
        CASE
            WHEN p.amenities IS NOT NULL AND array_length(p.amenities, 1) > 0 THEN array_to_string(p.amenities, ' '::text) || ' '::text
            ELSE ''::text
        END) ||
        CASE
            WHEN p.price > 0::numeric THEN
            CASE
                WHEN p.price >= 10000000::numeric THEN ((((((round(p.price / 10000000.0, 2)::text || ' Cr '::text) || round(p.price / 10000000.0, 2)::text) || ' Crore '::text) || round(p.price / 10000000.0, 2)::text) || 'Cr '::text) || p.price::text) || ' '::text
                WHEN p.price >= 100000::numeric THEN ((((((((round(p.price / 100000.0, 2)::text || ' Lakh '::text) || round(p.price / 100000.0, 2)::text) || ' Lakhs '::text) || round(p.price / 100000.0, 2)::text) || 'L '::text) || round(p.price / 100000.0, 2)::text) || 'Lac '::text) || p.price::text) || ' '::text
                ELSE p.price::text || ' '::text
            END
            ELSE ''::text
        END) ||
        CASE
            WHEN p.purpose = 'Rent'::text AND p.rent_amount > 0::numeric THEN p.rent_amount::text || ' rent '::text
            ELSE ''::text
        END) ||
        CASE
            WHEN p.plot_details IS NOT NULL THEN ((((COALESCE(p.plot_details ->> 'layout_name'::text, ''::text) || ' '::text) || COALESCE(p.plot_details ->> 'approval_authority'::text, ''::text)) || ' '::text) || COALESCE(p.plot_details ->> 'zoning_type'::text, ''::text)) || ' '::text
            ELSE ''::text
        END AS search_text,
    p.area_unit,
    p.price_per_unit
   FROM properties p
     LEFT JOIN cities c ON p.city_id = c.id
     LEFT JOIN localities l ON p.locality_id = l.id
     LEFT JOIN property_types pt ON p.property_type_id = pt.id
     LEFT JOIN builders b ON p.builder_id = b.id
     LEFT JOIN projects pr ON p.project_id = pr.id
     LEFT JOIN profiles prof_agent ON p.assigned_agent_id = prof_agent.id
     LEFT JOIN profiles prof_owner ON p.owner_id = prof_owner.id;
