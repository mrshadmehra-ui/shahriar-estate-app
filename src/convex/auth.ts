// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation
// (we ARE adding a new provider: `Password` — email + password accounts, required for manager-created users).

import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { emailOtp } from "./auth/emailOtp";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      // Store name/phone from sign-up params. Role is intentionally left
      // unset here: ensureRole() assigns super_admin to the very first user
      // and "owner" to everyone who self-registers afterwards. Manager-created
      // users get their role set by the adminCreateUser action instead.
      profile: (params) => {
        const profile: { email: string; name?: string; phone?: string } = {
          email: params.email as string,
        };
        const name = params.name as string | undefined;
        const phone = params.phone as string | undefined;
        if (name) profile.name = name;
        if (phone) profile.phone = phone;
        return profile;
      },
    }),
    emailOtp,
  ],
});