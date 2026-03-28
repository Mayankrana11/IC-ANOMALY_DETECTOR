import { Upload } from "lucide-react"
import { motion } from "framer-motion"

export default function UploadBox({onUpload}){

const handleChange = (e)=>{
const file = e.target.files[0]
if(file) onUpload(file)
}

return (

<motion.div 
initial={{opacity:0,y:20}}
animate={{opacity:1,y:0}}
className="bg-slate-800 p-8 rounded-xl shadow-lg text-center">

<Upload size={40} className="mx-auto mb-4"/>

<h2 className="text-xl font-semibold mb-2">
Upload CCTV Video
</h2>

<input 
type="file"
accept="video/*"
onChange={handleChange}
className="text-sm"
/>

</motion.div>

)
}