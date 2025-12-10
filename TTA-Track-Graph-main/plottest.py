from fastapi import FastAPI, HTTPException
from datetime import datetime
from bson import ObjectId
import pandas as pd

from app.schemas import EntryStart, Entry, ProjectCreate, Project, EntryUpdate
from app.models import entry_helper, project_helper
from app.configurations import db, entries_collection, projects_collection
import matplotlib.pyplot as plt
import numpy as np

entries = entries_collection.find({"project_group_id": ObjectId("6922093b1d8902de3a6777c7")})   

date = []
duration = []

for e in entries:
    entry = entry_helper(e)
    date.append(entry["starttime"].strftime("%Y-%m-%d"))
    duration.append(entry["duration"])

plt.plot(date, duration)
plt.show()