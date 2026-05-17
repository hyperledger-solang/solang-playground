import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account?.access_token;
        token.refreshToken = account?.refresh_token;
      }
      return token;
    },

    async session({ session, token }) {
      (session as any).accessToken = (token as any).accessToken;
      (session as any).refreshToken = (token as any).refreshToken;
      return session;
    },
  },

  providers: [
    Google({
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile https://www.googleapis.com/auth/drive",
        },
      },
    }),
  ],
});
