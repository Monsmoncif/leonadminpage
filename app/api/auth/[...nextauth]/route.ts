export const dynamic = "force-dynamic";
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import connectDB from "@/lib/db";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        try {
          await connectDB();
          let user = await User.findOne({ email: credentials.email }).select("+password");

          // --- AUTO-CREATE DEMO ACCOUNTS IF THEY DON'T EXIST ---
          if (!user && credentials.email === "admin@gmail.com" && credentials.password === "admin123") {
            const hashedPassword = await bcrypt.hash("admin123", 10);
            user = await User.create({
              name: "Admin User",
              email: "admin@gmail.com",
              password: hashedPassword,
              role: "admin",
              status: "active"
            });
          }

          if (!user && credentials.email === "driver@gmail.com" && credentials.password === "driver123") {
            const hashedPassword = await bcrypt.hash("driver123", 10);
            user = await User.create({
              name: "Driver User",
              email: "driver@gmail.com",
              password: hashedPassword,
              role: "driver",
              status: "active"
            });
          }
          // -----------------------------------------------------

          if (!user) {
            throw new Error("Invalid credentials");
          }

          const isMatch = await bcrypt.compare(credentials.password, user.password as string);

          if (!isMatch) {
            throw new Error("Invalid credentials");
          }

          if (user.status !== "active") {
            throw new Error("Account is inactive");
          }

          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
          };
        } catch (error) {
          console.error("Auth Error:", error);
          throw new Error("Authentication failed");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_demo_purposes_only",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
