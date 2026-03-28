export default function VideoPlayer({video}){

if(!video) return null

return(

<div className="mt-6">

<h2 className="text-lg mb-2">Annotated Detection</h2>

<video 
controls
className="w-full rounded-xl">

<source src={video} type="video/mp4"/>

</video>

</div>

)

}