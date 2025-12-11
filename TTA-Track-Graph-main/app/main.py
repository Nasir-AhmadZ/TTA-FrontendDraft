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
current_active_user = "691c8bf8d691e46d00068d3d"  # Default user ID

def rabbitmq_consumer():
    """Listen for user login/logout messages from RabbitMQ"""
    global current_active_user
    try:
        connection = pika.BlockingConnection(pika.URLParameters(RABBITMQ_URL))
        channel = connection.channel()
        
        # Declare queues
        channel.queue_declare(queue='user_login', durable=True)
        channel.queue_declare(queue='user_logout', durable=True)
        
        def login_callback(ch, method, properties, body):
            global current_active_user
            try:
                message = json.loads(body)
                user_id = message.get('user_id')
                if user_id:
                    current_active_user = user_id
                    
                    # Clear default user data when someone logs in
                    default_user_id = "691c8bf8d691e46d00068d3d"
                    default_projects = list(projects_collection.find({"owner_id": ObjectId(default_user_id)}))
                    project_ids = [project["_id"] for project in default_projects]
                    
                    if project_ids:
                        entries_collection.delete_many({"project_group_id": {"$in": project_ids}})
                    projects_collection.delete_many({"owner_id": ObjectId(default_user_id)})
                    
                    print(f"Updated current user to: {current_active_user}")
            except Exception as e:
                print(f"Error processing login message: {e}")
            ch.basic_ack(delivery_tag=method.delivery_tag)
        
        def logout_callback(ch, method, properties, body):
            global current_active_user
            try:
                current_active_user = "691c8bf8d691e46d00068d3d"  # Reset to default user ID
                print(f"User logged out, reset to default user")
            except Exception as e:
                print(f"Error processing logout message: {e}")
            ch.basic_ack(delivery_tag=method.delivery_tag)
        
        channel.basic_consume(queue='user_login', on_message_callback=login_callback)
        channel.basic_consume(queue='user_logout', on_message_callback=logout_callback)
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
    # Only show data for current active user
    if user_id != current_active_user:
        raise HTTPException(status_code=403, detail="Access denied")
        
    projects = projects_collection.find({"owner_id": ObjectId(user_id)})
    totals = defaultdict(int) 

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
    totals = defaultdict(int)
    
    # Find projects owned by current user
    user_projects = projects_collection.find({"owner_id": ObjectId(current_active_user)})
    project_ids = [project["_id"] for project in user_projects]
    
    if not project_ids:
        raise HTTPException(status_code=404, detail="No projects found")
    
    # Get entries for this user's projects
    entries = entries_collection.find({"project_group_id": {"$in": project_ids}})
    for e in entries:
        entry = entry_helper(e)
        if entry.get("duration") and entry.get("starttime"):
            date_time = entry["starttime"].strftime("%Y-%m-%d")
            totals[date_time] += int(entry["duration"])
    
    if not totals:
        raise HTTPException(status_code=404, detail="No time entries found")
    
    sort_entries = sorted(totals.items())
    date = [d for d, _ in sort_entries]
    duration = [v for _, v in sort_entries]
    
    plt.figure(figsize=(10, 6))
    plt.plot(date, duration, marker='o')
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
    return {"user_id": current_active_user, "is_default": current_active_user == "691c8bf8d691e46d00068d3d"}

# python -m uvicorn app.main:app --reload