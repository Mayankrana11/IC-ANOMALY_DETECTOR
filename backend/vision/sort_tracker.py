# backend/vision/sort_tracker.py
import numpy as np
from filterpy.kalman import KalmanFilter
from scipy.optimize import linear_sum_assignment

def iou(bb_test, bb_gt):
    xx1 = max(bb_test[0], bb_gt[0])
    yy1 = max(bb_test[1], bb_gt[1])
    xx2 = min(bb_test[2], bb_gt[2])
    yy2 = min(bb_test[3], bb_gt[3])
    w = max(0., xx2 - xx1)
    h = max(0., yy2 - yy1)
    inter = w * h
    area1 = (bb_test[2]-bb_test[0])*(bb_test[3]-bb_test[1])
    area2 = (bb_gt[2]-bb_gt[0])*(bb_gt[3]-bb_gt[1])
    return inter / (area1 + area2 - inter + 1e-6)

def associate(dets, trks, iou_thres=0.3):
    if len(trks) == 0:
        return [], list(range(len(dets))), []

    cost = np.zeros((len(dets), len(trks)))
    for i,d in enumerate(dets):
        for j,t in enumerate(trks):
            cost[i,j] = 1 - iou(d[:4], t[:4])

    r,c = linear_sum_assignment(cost)
    matches, um_d, um_t = [], [], []

    for i in range(len(dets)):
        if i not in r:
            um_d.append(i)
    for j in range(len(trks)):
        if j not in c:
            um_t.append(j)

    for i,j in zip(r,c):
        if 1 - cost[i,j] < iou_thres:
            um_d.append(i)
            um_t.append(j)
        else:
            matches.append((i,j))

    return matches, um_d, um_t

class Track:
    count = 0
    def __init__(self, bbox, cls):
        self.id = Track.count
        Track.count += 1
        self.bbox = bbox
        self.cls = cls
        self.age = 0
        self.missed = 0
        self.history = []

    def update(self, bbox):
        self.bbox = bbox
        self.missed = 0
        self.history.append(bbox)

    def predict(self):
        self.missed += 1

class SortTracker:
    def __init__(self, max_age=5, iou_thres=0.3):
        self.tracks = []
        self.max_age = max_age
        self.iou_thres = iou_thres

    def update(self, detections):
        dets = [d["bbox"] for d in detections]
        classes = [d["class"] for d in detections]

        trk_boxes = [t.bbox for t in self.tracks]
        matches, um_d, um_t = associate(dets, trk_boxes, self.iou_thres)

        for di,ti in matches:
            self.tracks[ti].update(dets[di])

        for di in um_d:
            self.tracks.append(Track(dets[di], classes[di]))

        for ti in um_t:
            self.tracks[ti].predict()

        self.tracks = [t for t in self.tracks if t.missed <= self.max_age]
        return self.tracks
