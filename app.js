const scrapperHostname = "https://summarize-this-dad610347f4b.herokuapp.com";

const shouldButtonBeDisabled = (state) => {
  const button = document.querySelector("button");
  if (state) {
    button.innerText = "Loading...";
  } else {
    button.innerText = "Summarize!";
  }
  button.disabled = state;
};

const makePostRequest = async (url, data) => {
  const config = {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  };

  try {
    const res = await fetch(url, config);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (error) {
    console.error(error);
    shouldButtonBeDisabled(false);
    showErrorBar();
  }
};

const makeGetRequest = async (url) => {
  try {
    const res = await fetch(url);

    const data = await res.json();
    return data;
  } catch (error) {
    console.error(error);
    shouldButtonBeDisabled(false);
    showErrorBar();
  }
};

const showErrorBar = () => {
  const errorBar = document.querySelector("#error");
  errorBar.classList.toggle("hidden");

  const messageEl = document.createElement("p");
  messageEl.innerText = "Unable to summarize article. Please try again later.";
  setTimeout(() => {
    errorBar.classList.toggle("hidden");
  }, 5000);
};

const getTaskStatus = async (taskId) => {
  let res;
  const url = `${scrapperHostname}/scrape-status/${taskId}`;
  do {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    res = await makeGetRequest(url);
  } while (res && res.status === "Processing");
  if (res.error && res.error === "Task failed.") {
    console.error("Failed to summarize article");
    shouldButtonBeDisabled(false);
    return res;
  }
  return res;
};

const populateResult = (data) => {
  const { title, summary } = data;
  const articleEl = document.createElement("article");
  articleEl.className = "result";

  const titleEl = document.createElement("h2");
  titleEl.className = "title";
  titleEl.innerText = title;
  articleEl.appendChild(titleEl);

  const summaryEl = document.createElement("p");
  summaryEl.className = "summary";
  summaryEl.innerText = summary;
  articleEl.appendChild(summaryEl);

  const wrapperEl = document.querySelector("#wrapper");
  wrapperEl.appendChild(articleEl);
};

async function getCurrentTabUrl() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0]) {
        resolve(tabs[0].url);
      } else {
        reject(new Error("No active tab found."));
      }
    });
  });
}

const summarize = async () => {
  shouldButtonBeDisabled(true);

  const currentTabUrl = await getCurrentTabUrl();
  const contentType = "general";
  const data = {
    url: currentTabUrl,
    contentType,
  };

  const endpoint = `${scrapperHostname}/scrape`;
  const task = await makePostRequest(endpoint, data);
  if (task.summary) {
    populateResult(task);
    shouldButtonBeDisabled(false);
    return;
  }
  const taskId = task.taskId;
  const res = await getTaskStatus(taskId);
  if (res.error) {
    showErrorBar();
    return;
  }

  populateResult(res);
  shouldButtonBeDisabled(false);
};

const summarizeBtn = document.querySelector("button");
summarizeBtn.addEventListener("click", (e) => {
  e.preventDefault();
  summarize();
});
