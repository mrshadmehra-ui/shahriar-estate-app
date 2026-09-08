import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // add other tables here

    // consultation requests submitted through the landing page form
    consultations: defineTable({
      name: v.string(), // full name of the requester
      phone: v.string(), // mobile number
      requestType: v.optional(v.string()), // e.g. buy / sell / rent
      description: v.optional(v.string()), // free text details
    }),

    // real estate listings shown on the landing page and managed from the dashboard
    properties: defineTable({
      title: v.string(),
      location: v.string(),
      area: v.string(), // district within Shahriar
      category: v.union(
        v.literal("مسکونی"),
        v.literal("اداری"),
        v.literal("تجاری"),
        v.literal("صنعتی"),
      ),
      transaction: v.union(v.literal("فروش"), v.literal("اجاره")),
      image: v.string(), // main photo URL
      gallery: v.array(v.string()), // photo URLs for the detail view
      specs: v.array(v.object({ icon: v.string(), label: v.string() })),
      amenities: v.array(v.string()),
      description: v.string(),
      price: v.optional(v.string()), // display price, e.g. ۲,۸۵۰,۰۰۰,۰۰۰ تومان
      pricePerMeter: v.optional(v.string()), // display per-meter price
      priceValue: v.number(), // raw value (total for sale, monthly for rent) used by search filters
    })
      .index("by_category", ["category"])
      .index("by_transaction", ["transaction"]),

    // tableName: defineTable({
    //   ...
    //   // table fields
    // }).index("by_field", ["field"])
  },
  {
    schemaValidation: false,
  },
);

export default schema;
