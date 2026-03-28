import { motion } from "framer-motion"

export default function ResultPanel({data}){

if(!data) return null

return(

<motion.div
initial={{opacity:0}}
animate={{opacity:1}}
className="bg-slate-800 p-6 rounded-xl mt-6">

<h2 className="text-xl font-bold mb-4">
AI Analysis
</h2>

<div className="grid grid-cols-2 gap-4">

<div className="bg-slate-700 p-4 rounded">
<p className="text-gray-300">Event</p>
<p className="text-lg">{data.eventType}</p>
</div>

<div className="bg-slate-700 p-4 rounded">
<p className="text-gray-300">Severity</p>
<p className="text-lg text-red-400">
{data.aiDecision.severity}
</p>
</div>

<div className="bg-slate-700 p-4 rounded col-span-2">
<p className="text-gray-300">Reason</p>
<p>{data.aiDecision.reason}</p>
</div>

<div className="bg-slate-700 p-4 rounded col-span-2">
<p className="text-gray-300">Frames analyzed</p>
<p>{data.framesAnalyzed}</p>
</div>

</div>

</motion.div>

)

}