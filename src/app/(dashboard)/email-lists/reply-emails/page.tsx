"use client";
import SearchNotFound from "@/app/(dashboard)/components/SearchNotFound";
import EmailList from "../components/EmailList";
import React, { useEffect, useState } from "react";
import { AllEmailListApi } from "@/app/api/allemaillistapi";
import Loader1 from "../../components/Loader1";
import { useSearchParams } from "next/navigation";

export default function ReplyEmails() {
  const [isLoading, setIsLoading] = useState(false);
  const [clientEmails, setClientEmails] = useState<any[]>([]);
  const [routeurl, setRouteUrl] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const searchParams = useSearchParams();
  const currentPage = searchParams.get("page") ?? 0;
  const [totalResults, setTotalResults] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    const pathname = window.location.pathname;

    if (pathname === "/email-lists/reply-emails") {
      setRouteUrl("replyEmails");
    } else if (pathname === "/email-lists/client-emails") {
      setRouteUrl("clientEmails");
    } else {
      setRouteUrl(""); // Set routeUrl to null if pathname doesn't match any condition
    }
    console.log(pathname);
  }, []); // This useEffect runs only once on initial mount due to the empty dependency array

  useEffect(() => {
    setIsLoading(true);
    const getEmails = async () => {
      console.log(currentPage)
      try {
        if (routeurl) {
          // Check if routeurl has a value before making the API call
          const response = await AllEmailListApi(routeurl, currentPage);
          console.log(response);
          setClientEmails(response.data.emailLists); // Assuming response is the array of email lists
          setIsLoading(false);
        }
      } catch (error) {
        console.log(error);
        setIsLoading(false);
      }
    };
    getEmails();
  }, [routeurl, currentPage]); // Run this effect whenever routeurl changes

  useEffect(() => {
    setIsLoading(true);
    const getEmails = async () => {
      try {
        if (routeurl) {
          // Check if routeurl has a value before making the API call
          const response = await AllEmailListApi(routeurl, 
                currentPage,
                searchQuery === "" ? null : searchQuery,
            );
          console.log(response);
          setClientEmails(response.data.emailLists); // Assuming response is the array of email lists
          setIsLoading(false);
        }
      } catch (error) {
        console.log(error);
        setIsLoading(false);
      }
    };
    getEmails();
  }, [routeurl, currentPage, searchQuery]); // Run this effect whenever routeurl changes

  const searchTerm = "";
  return (
    <>
      {
        // attempt to display the search results, after it's done loading, if there's a search Term
        searchTerm ? (
          clientEmails.length === 0 ? (
            <SearchNotFound
              message={
                <>
                  We couldn't find Email that match your search. Please try
                  using <br />
                  different, fewer filters or typing another search request.
                </>
              }
              title={<>Result Not Found</>}
            />
          ) : (
            <EmailList results={clientEmails} setResults={setClientEmails} 
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            currentPage={currentPage} pageSize = {pageSize} totalResults = {totalResults}
            />
          )
        ) : (
          <EmailList results={clientEmails} setResults={setClientEmails} 
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            currentPage={currentPage} pageSize = {pageSize} totalResults = {totalResults}
            />
        )
      }
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 9999,
            background: "rgba(255, 255, 255, 0.8)",
            padding: "20px",
            borderRadius: "5px",
          }}
        >
          <Loader1 />
        </div>
      )}
    </>
  );
}
