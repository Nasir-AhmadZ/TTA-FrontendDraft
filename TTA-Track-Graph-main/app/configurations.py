from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import os
from dotenv import load_dotenv

load_dotenv()

uri = os.getenv("MONGODB_URI_TIMETRACK", "mongodb+srv://User:Password@cluster0.82ogu5x.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqps://iuwoopfu:kE30ykbxRQtOorM_m_JzD-pya8t5btat@hawk.rmq.cloudamqp.com/iuwoopfu")

# create a new client and connect to the server
client = MongoClient(uri, server_api=ServerApi('1'))

db = client.user_db
entries_collection = db["entries"]
projects_collection = db["projects"]

# Current user tracking
current_user = "default_user"