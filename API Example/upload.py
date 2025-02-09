import requests

def upload_text_to_zluqet(text):
    domain = "https://paste.zluqe.org" # the url for the zluqet instance
    api_url = f"{domain}/api/documents"

    response = requests.post(api_url, data=text)
    
    if response.status_code == 200:
        json_data = response.json()
        key = json_data.get("key")
        if key:
            return f"{domain}/{key}"
        else:
            raise Exception("No paste key returned in the response.")
    else:
        raise Exception(f"Failed to upload text: {response.status_code} {response.text}")

if __name__ == "__main__":
    sample_text = "Text"
    
    try:
        paste_link = upload_text_to_zluqet(sample_text)
        print("Uploaded successfully. Link:", paste_link)
    except Exception as e:
        print("An error occurred:", e)