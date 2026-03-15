@REM ----------------------------------------------------------------------------
@REM Licensed to the Apache Software Foundation (ASF) under one
@REM or more contributor license agreements.  See the NOTICE file
@REM distributed with this work for additional information
@REM regarding copyright ownership.  The ASF licenses this file
@REM to you under the Apache License, Version 2.0 (the
@REM "License"); you may not use this file except in compliance
@REM with the License.  You may obtain a copy of the License at
@REM
@REM    https://www.apache.org/licenses/LICENSE-2.0
@REM
@REM Unless required by applicable law or agreed to in writing,
@REM software distributed under the License is distributed on an
@REM "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
@REM KIND, either express or implied.  See the License for the
@REM specific language governing permissions and limitations
@REM under the License.
@REM ----------------------------------------------------------------------------

@REM Begin all REM://lines with '@' in case MVNW_VERBOSE is set env
@REM https://github.com/apache/maven-wrapper

@IF "%__MVNW_CMD__%"=="" (%COMSPEC% /E:ON /V:ON /D /C "SET __MVNW_CMD__=%%~0&& CALL %%~0 %*" || EXIT /B) ELSE (SET __MVNW_CMD__=)
@SETLOCAL

@SET __MVNW_ARG0_=%~0
@SET MVNW_USERNAME=%USERNAME%

@FOR %%o IN (%*) DO @IF "%%~o"=="-v" SET MVNW_VERBOSE=true
@IF NOT DEFINED MVNW_VERBOSE SET MVNW_VERBOSE=false

@SET "MVNW_REPOURL=https://repo.maven.apache.org/maven2"
@SET "MVNW_WRAPPER_JAR=.mvn\wrapper\maven-wrapper.jar"

@FOR /F "usebackq tokens=1,2 delims==" %%A IN (".mvn\wrapper\maven-wrapper.properties") DO @(
    @IF "%%~A"=="wrapperUrl" SET "MVNW_WRAPPER_URL=%%~B"
    @IF "%%~A"=="distributionUrl" SET "MVNW_DIST_URL=%%~B"
)

@IF NOT EXIST "%MVNW_WRAPPER_JAR%" (
    @echo Downloading Maven Wrapper...
    @powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%MVNW_WRAPPER_URL%' -OutFile '%MVNW_WRAPPER_JAR%'}"
)

@SET WRAPPER_LAUNCHER=org.apache.maven.wrapper.MavenWrapperMain

%JAVA_HOME%\bin\java.exe ^
  %MAVEN_OPTS% ^
  %MAVEN_DEBUG_OPTS% ^
  -classpath "%MVNW_WRAPPER_JAR%" ^
  "-Dmaven.multiModuleProjectDirectory=%~dp0" ^
  %WRAPPER_LAUNCHER% %*

@IF NOT "%MVNW_VERBOSE%"=="true" @ECHO OFF
@IF "%ERRORLEVEL%"=="0" GOTO :mvnw_end

@REM Fallback: try to use java from PATH
java.exe ^
  %MAVEN_OPTS% ^
  %MAVEN_DEBUG_OPTS% ^
  -classpath "%MVNW_WRAPPER_JAR%" ^
  "-Dmaven.multiModuleProjectDirectory=%~dp0" ^
  %WRAPPER_LAUNCHER% %*

:mvnw_end
@ENDLOCAL & SET ERROR_CODE=%ERRORLEVEL%
@EXIT /B %ERROR_CODE%
