
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

uri = "mongodb+srv://User:Password@cluster0.82ogu5x.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

# create a new client and connect to the server
client = MongoClient(uri, server_api=ServerApi('1'))

db = client.user_db
entries_collection = db["entries"]
projects_collection = db["projects"]

