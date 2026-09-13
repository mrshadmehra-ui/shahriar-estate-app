// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation
// (we ARE adding a new provider: `Password` — email + password accounts, required for manager-created users).

import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { emailOtp } from "./auth/emailOtp";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      // Self-registration (signUp): the user picks «مالک» or «مستأجر» and MUST
      // provide a phone number. Role is stored from the form; ensureRole() then
      // promotes the very first registered user to super_admin. Manager-created
      // users get their role via the adminCreateUser action instead.
      profile: (params) => {
        const profile: { email: string; name?: string; phone?: string; role?: string } = {
          email: params.email as string,
        };
        const name = params.name as string | undefined;
        const phone = params.phone as string | undefined;
        const flow = params.flow as string | undefined;
        if (name) profile.name = name;
        if (flow === "signUp") {
          const digits = (phone ?? "")
            .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
            .replace(/[^0-9]/g, "");
          if (digits.length < 10) {
            throw new Error("شماره تلفن الزامی است و باید حداقل ۱۰ رقم باشد.");
          }
          profile.phone = digits;
          profile.role = params.signupRole === "tenant" ? "tenant" : "owner";
        } else if (phone) {
          profile.phone = phone;
        }
        return profile;
      },
    }),
    emailOtp,
  ],
});