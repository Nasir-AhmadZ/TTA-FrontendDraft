from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from collections import defaultdict
from bson import ObjectId
import threading
import pika
import json

from .schemas import EntryStart, Entry, ProjectCreate, Project, EntryUpdate
from .models import entry_helper, project_helper
from .configurations import db, entries_collection, projects_collection, RABBITMQ_URL, current_user
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from pathlib import Path

app = FastAPI(title="Time Tracker Graph")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variable to store current user
current_active_user = "default_user"

def rabbitmq_consumer():
    """Listen for user login messages from RabbitMQ"""
    global current_active_user
    try:
        connection = pika.BlockingConnection(pika.URLParameters(RABBITMQ_URL))
        channel = connection.channel()
        
        # Declare the same queue as timetrack service
        channel.queue_declare(queue='user_login', durable=True)
        
        def callback(ch, method, properties, body):
            global current_active_user
            try:
                message = json.loads(body)
                current_active_user = message.get('username', 'default_user')
                print(f"Updated current user to: {current_active_user}")
            except Exception as e:
                print(f"Error processing message: {e}")
            ch.basic_ack(delivery_tag=method.delivery_tag)
        
        channel.basic_consume(queue='user_login', on_message_callback=callback)
        channel.start_consuming()
    except Exception as e:
        print(f"RabbitMQ connection failed: {e}")

# Start RabbitMQ consumer in background thread
rabbit_thread = threading.Thread(target=rabbitmq_consumer, daemon=True)
rabbit_thread.start()

#******************************Graphing functions****************************************

@app.get("/graph/proj/{project_id}",status_code=200)
def get_graph_by_project(project_id: str):
    #validate ObjectId format
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project id")

    #check if the project exists
    project = projects_collection.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    totals = defaultdict(int) 
    date = [] 
    duration = []

    entries = entries_collection.find({"project_group_id": project["_id"]})
    for e in entries:
        entry = entry_helper(e)
        date_time = entry["starttime"].strftime("%Y-%m-%d")
        totals[date_time] += int(entry["duration"] or 0)

    sort_entries = sorted(totals.items())
    date = [d for d, _ in sort_entries]
    duration = [v for _, v in sort_entries]   
    plt.plot(date, duration)
    plt.grid(True)
    plt.savefig("/tmp/graph.png")
    image_path = Path("/tmp/graph.png")
    if not image_path.is_file():
        return {"error": "Image not found on the server"}
    return FileResponse(image_path)

@app.get("/graph/user/{user_id}",status_code=200)
def get_graph_by_user(user_id: str):
    projects = projects_collection.find({"owner_id": ObjectId(user_id)})
    totals = defaultdict(int) 

    date = [] 
    duration = []

    for project in projects:
        entries = entries_collection.find({"project_group_id": project["_id"]})
        for e in entries:
            entry = entry_helper(e)
            date_time = entry["starttime"].strftime("%Y-%m-%d")
            totals[date_time] += int(entry["duration"] or 0)

    sort_entries = sorted(totals.items())
    date = [d for d, _ in sort_entries]
    duration = [v for _, v in sort_entries]    

    plt.plot(date, duration)
    plt.grid(True)
    plt.savefig("/tmp/graph.png")
    image_path = Path("/tmp/graph.png")
    if not image_path.is_file():
        return {"error": "Image not found on the server"}
    return FileResponse(image_path)

@app.get("/graph/current-user", status_code=200)
def get_graph_current_user():
    """Get graph for the currently active user"""
    global current_active_user
    
    totals = defaultdict(int)
    
    # Find entries for current user (assuming username is stored in entries or projects)
    entries = entries_collection.find({})
    for e in entries:
        entry = entry_helper(e)
        if entry.get("duration") and entry.get("starttime"):
            date_time = entry["starttime"].strftime("%Y-%m-%d")
            totals[date_time] += int(entry["duration"])
    
    if not totals:
        raise HTTPException(status_code=404, detail=f"No time entries found for user: {current_active_user}")
    
    sort_entries = sorted(totals.items())
    date = [d for d, _ in sort_entries]
    duration = [v for _, v in sort_entries]
    
    plt.figure(figsize=(10, 6))
    plt.plot(date, duration, marker='o')
    plt.title(f'Daily Time Tracking - {current_active_user}')
    plt.xlabel('Date')
    plt.ylabel('Duration (seconds)')
    plt.xticks(rotation=45)
    plt.grid(True)
    plt.tight_layout()
    plt.savefig("/tmp/graph.png")
    plt.close()
    
    image_path = Path("/tmp/graph.png")
    if not image_path.is_file():
        return {"error": "Image not found on the server"}
    return FileResponse(image_path)

@app.get("/current-user")
def get_current_user():
    """Get the currently active user"""
    return {"username": current_active_user}

# python -m uvicorn app.main:app --reload