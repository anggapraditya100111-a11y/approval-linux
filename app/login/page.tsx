import LoginForm from "@/components/LoginForm";
export default async function LoginPage({searchParams}:{searchParams:Promise<{returnTo?:string}>}){const params=await searchParams;return <LoginForm returnTo={params.returnTo||"/admin"}/>}
