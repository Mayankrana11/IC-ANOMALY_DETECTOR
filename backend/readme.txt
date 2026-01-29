node server.js


python -m vision.vision_engine
curl.exe -X POST http://localhost:4000/api/analyze -F "video=@uploads/test.mp4"
curl.exe -X POST http://localhost:4000/api/analyze -F "video=@uploads/test2.mp4"
curl.exe -X POST http://localhost:4000/api/analyze -F "video=@uploads/test3.mp4"
curl.exe -X POST http://localhost:4000/api/analyze -F "video=@uploads/test4.mp4"
curl.exe -X POST http://localhost:4000/api/analyze -F "video=@uploads/test5.mp4"
curl.exe -X POST http://localhost:4000/api/analyze -F "video=@uploads/test6.mp4"
curl.exe -X POST http://localhost:4000/api/analyze -F "video=@uploads/test7.mp4"
python -m vision.vision_engine



