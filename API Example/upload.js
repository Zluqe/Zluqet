// =====================================
// API Example for Zluqet (JS)
// Created by Person0z
// Copyright (c) 2025 Zluqe
// =====================================

const uploadTextToZluqet = async (text) => {
    const domain = "https://paste.zluqe.org"; // The URL for the Zluqet instance
    const apiUrl = `${domain}/api/documents`;
  
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: text,
    });
  
    if (response.ok) {
      const jsonData = await response.json();
      const key = jsonData.key;
      if (key) {
        return `${domain}/${key}`;
      } else {
        throw new Error("No paste key returned in the response.");
      }
    } else {
      const responseText = await response.text();
      throw new Error(`Failed to upload text: ${response.status} ${responseText}`);
    }
  };
  
  (async () => {
    const sampleText = "Text";
  
    try {
      const pasteLink = await uploadTextToZluqet(sampleText);
      console.log("Uploaded successfully. Link:", pasteLink);
    } catch (error) {
      console.error("An error occurred:", error);
    }
  })();