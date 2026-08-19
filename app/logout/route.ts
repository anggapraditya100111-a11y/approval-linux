import { NextResponse } from "next/server";
import { destroySession,getSessionToken,sessionCookieName } from "@/app/app-auth";

function loginUrl(request: Request) {
  const configuredBaseUrl = process.env.APP_BASE_URL?.trim();
  if (configuredBaseUrl) {
    try {
      return new URL("/login", configuredBaseUrl.endsWith("/") ? configuredBaseUrl : `${configuredBaseUrl}/`);
    } catch {
      // Fall back to the request URL when APP_BASE_URL is malformed.
    }
  }
  return new URL("/login", request.url);
}

export async function GET(request:Request){const token=await getSessionToken();if(token)await destroySession(token);const response=NextResponse.redirect(loginUrl(request));response.cookies.set(sessionCookieName(),"",{path:"/",expires:new Date(0)});return response}
