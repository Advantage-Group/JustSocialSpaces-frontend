import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ImageEditor from "../components/ImageEditor";
import { useApp } from "../context/AppContext";
import { ActionTypes } from "../context/AppContext";
import "../login.css";
import config from "../config.js";

// ...rest of PickProfilePhoto.js code...