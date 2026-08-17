import { NextResponse } from "next/server";
import { destroySession,getSessionToken,sessionCookieName } from "@/app/app-auth";
export async function GET(request:Request){const token=await getSessionToken();if(token)await destroySession(token);const response=NextResponse.redirect(new URL("/login",request.url));response.cookies.set(sessionCookieName(),"",{path:"/",expires:new Date(0)});return response}
