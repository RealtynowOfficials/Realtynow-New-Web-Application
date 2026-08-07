import { z } from 'zod';

const propertyWizardSchema = z.object({
  media_urls: z
    .object({
      videos: z.array(z.string()).optional(),
      virtual_tour: z.string().optional(),
      floor_plan: z.string().optional(),
      brochure: z.string().optional(),
    })
    .optional(),
});

console.log(propertyWizardSchema.safeParse({ media_urls: { videos: [""] } }));
console.log(propertyWizardSchema.safeParse({ media_urls: { videos: { "0": "" } } }));
console.log(propertyWizardSchema.safeParse({ media_urls: { virtual_tour: "" } }));
