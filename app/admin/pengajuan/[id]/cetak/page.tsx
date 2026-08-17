import PrintableSubmission from "@/components/PrintableSubmission";
export default async function PrintPage({params}:{params:Promise<{id:string}>}){const{id}=await params;return <PrintableSubmission id={id}/>}
