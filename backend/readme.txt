//backend installs

cd backend
npm install 
npm install cors ffmpeg multer express axios dotenv openai
node server.js

//python installs 

pip install ultralytics opencv-python numpy torch torchvision

//frontend installs

cd frontend 
npm install
npm install -D tailwindcss postcss autoprefixer axios 
npm run dev


//running instructions make sure server is running

python -m vision.vision_engine
curl.exe -X POST http://localhost:4000/api/analyze -F "video=@uploads/test.mp4"
python -m vision.vision_engine
