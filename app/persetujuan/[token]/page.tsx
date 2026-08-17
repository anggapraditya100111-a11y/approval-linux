import ApprovalLink from "@/components/ApprovalLink";
export default async function Page({params}:{params:Promise<{token:string}>}){const {token}=await params;return <ApprovalLink token={token}/>}
